import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
import type { FieldDefinition, SchemaValues } from "$lib/form-builder/core/types";
import { notifyGlobalsDraftReplaced, saveGlobalsDraft } from "$lib/globals/globals-draft";
import { valuesEqual } from "$lib/PageEditor/changes/diff-model";
import { setDraftFieldValue } from "$lib/PageEditor/changes/draft-values";
import { updatePageDraft } from "$lib/PageEditor/changes/draft-write";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
import { createId } from "./chat-storage";
import { sanitizeRichText } from "./sanitize-html";
import {
	GLOBALS_TARGET,
	findField,
	findSitePage,
	isTranslatable,
	pageLabel,
	readGlobalsValues,
	readPageValues,
	schemaForInstance,
	selectOptionValues
} from "./site-content";

/** One field/locale the agent changed. `before` is what the editor showed (defaults included). */
export type EditedField = {
	instanceId: string;
	fieldName: string;
	locale: string;
	before: unknown;
	after: unknown;
};

export type EditRecord = {
	id: string;
	/** A page id, or "globals". */
	target: string;
	targetLabel: string;
	fields: EditedField[];
	createdAt: string;
	undoneAt?: string;
};

export type RequestedChange = {
	instanceId?: unknown;
	field?: unknown;
	locale?: unknown;
	value?: unknown;
};

type Resolved = { instanceId: string; field: FieldDefinition; locale: string; value: unknown };

function isColor(value: string): boolean {
	if (typeof CSS !== "undefined" && typeof CSS.supports === "function") return CSS.supports("color", value);
	return /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

/** Coerces and checks a value against its field definition. Returns an error message or the value to store. */
function validateValue(field: FieldDefinition, raw: unknown, locale: string): { value: unknown } | { error: string } {
	const name = `"${field.name}"`;
	switch (field.type) {
		case "text":
		case "textarea": {
			if (typeof raw !== "string") return { error: `${name} needs a string.` };
			if (field.type === "textarea" && field.maxLength && raw.length > field.maxLength) {
				return { error: `${name} allows at most ${field.maxLength} characters (got ${raw.length}).` };
			}
			if (field.required && raw.trim() === "") return { error: `${name} is required.` };
			return { value: field.type === "text" ? raw.replace(/\s*\n\s*/g, " ") : raw };
		}
		case "rich-editor": {
			if (typeof raw !== "string") return { error: `${name} needs an HTML string.` };
			const html = sanitizeRichText(raw);
			if (field.required && html.replace(/<[^>]*>/g, "").trim() === "") return { error: `${name} is required.` };
			return { value: html };
		}
		case "toggle": {
			if (typeof raw === "boolean") return { value: raw };
			if (raw === "true" || raw === "false") return { value: raw === "true" };
			return { error: `${name} needs true or false.` };
		}
		case "select": {
			const allowed = selectOptionValues(field, locale);
			const values = Array.isArray(raw) ? raw : [raw];
			if (!values.every((item): item is string => typeof item === "string")) {
				return { error: `${name} needs option values (strings).` };
			}
			const invalid = values.filter((item) => item !== "" && !allowed.includes(item));
			if (invalid.length > 0) {
				return { error: `${name} has no option ${invalid.map((item) => `"${item}"`).join(", ")}. Options: ${allowed.join(", ")}.` };
			}
			if (field.multiple) return { value: values.filter((item) => item !== "") };
			if (values.length !== 1) return { error: `${name} takes one value.` };
			return { value: values[0] };
		}
		case "colorpicker": {
			if (typeof raw !== "string" || !isColor(raw.trim())) return { error: `${name} needs a CSS color such as #1a73e8.` };
			const color = raw.trim();
			if (field.onlyPresets && field.presetColors && !field.presetColors.includes(color)) {
				return { error: `${name} only allows ${field.presetColors.join(", ")}.` };
			}
			return { value: color };
		}
		case "file-upload":
			return { error: `${name} is a file upload; the AI agent can't change files. Ask the user to upload it in the editor.` };
	}
}

/** Fields per instance of the target, to validate against. */
function resolveChange(
	target: string,
	instanceIds: string[],
	change: RequestedChange,
	index: number
): Resolved | { error: string } {
	const prefix = `changes[${index}]:`;
	const instanceId = target === GLOBALS_TARGET ? GLOBALS_TARGET : change.instanceId;
	if (typeof instanceId !== "string" || !instanceIds.includes(instanceId)) {
		return { error: `${prefix} unknown instanceId ${JSON.stringify(change.instanceId)}. Use one of: ${instanceIds.join(", ")}.` };
	}
	const schema = schemaForInstance(instanceId);
	const field = typeof change.field === "string" ? findField(schema, change.field) : undefined;
	if (!schema || !field) {
		return {
			error: `${prefix} "${instanceId}" has no field ${JSON.stringify(change.field)}. Fields: ${schema?.fields.map((item) => item.name).join(", ") ?? "none"}.`
		};
	}

	let locale = DEFAULT_LOCALE;
	if (isTranslatable(field)) {
		if (change.locale !== undefined && change.locale !== null && change.locale !== "") {
			if (typeof change.locale !== "string" || !LOCALES.includes(change.locale)) {
				return { error: `${prefix} unknown locale ${JSON.stringify(change.locale)}. Locales: ${LOCALES.join(", ")}.` };
			}
			locale = change.locale;
		}
	}

	const validated = validateValue(field, change.value, locale);
	if ("error" in validated) return { error: `${prefix} ${validated.error}` };
	return { instanceId, field, locale, value: validated.value };
}

export type UpdateResult = { edit: EditRecord | null; errors: string[] };

/**
 * Validates every change, then writes the valid ones in one draft write: a page's
 * IndexedDB draft (reviewed and committed in Changes) or the unsaved global variables.
 * Invalid changes are reported back so the model can fix and retry them.
 */
export async function applyContentUpdate(target: string, changes: RequestedChange[]): Promise<UpdateResult> {
	const isGlobals = target === GLOBALS_TARGET;
	const page = isGlobals ? undefined : findSitePage(target);
	if (!isGlobals && !page) return { edit: null, errors: [`Unknown target "${target}". Use a page id or "${GLOBALS_TARGET}".`] };
	if (changes.length === 0) return { edit: null, errors: ["No changes given."] };

	const instanceIds = isGlobals ? [GLOBALS_TARGET] : page!.instances.filter((item) => item.capsule).map((item) => item.instanceId);
	const errors: string[] = [];
	const resolved: Resolved[] = [];
	changes.forEach((change, index) => {
		const result = resolveChange(target, instanceIds, change, index);
		if ("error" in result) errors.push(result.error);
		else resolved.push(result);
	});
	if (resolved.length === 0) return { edit: null, errors };

	const current = isGlobals
		? { [GLOBALS_TARGET]: await readGlobalsValues() }
		: await readPageValues(page!).then((result) => {
				if (result.errorMessage) throw new Error(result.errorMessage);
				return result.values;
			});

	const fields: EditedField[] = [];
	for (const change of resolved) {
		const before = current[change.instanceId]?.[change.field.name]?.[change.locale];
		if (valuesEqual(before, change.value)) continue;
		// A later change to the same field/locale wins, as it would when typing.
		const existing = fields.findIndex(
			(item) => item.instanceId === change.instanceId && item.fieldName === change.field.name && item.locale === change.locale
		);
		if (existing >= 0) fields[existing].after = change.value;
		else fields.push({ instanceId: change.instanceId, fieldName: change.field.name, locale: change.locale, before, after: change.value });
	}
	if (fields.length === 0) return { edit: null, errors: errors.length ? errors : ["Every value was already the same; nothing changed."] };

	const writeError = await writeFields(target, fields.map((item) => ({ ...item, value: item.after })));
	if (writeError) return { edit: null, errors: [...errors, writeError] };

	return {
		edit: {
			id: createId(),
			target,
			targetLabel: isGlobals ? "Global variables" : pageLabel(target),
			fields,
			createdAt: new Date().toISOString()
		},
		errors
	};
}

type FieldWrite = { instanceId: string; fieldName: string; locale: string; value: unknown };

function setValues(values: PageEditorValuesByInstance, writes: FieldWrite[]): PageEditorValuesByInstance {
	return writes.reduce(
		(next, write) =>
			setDraftFieldValue(next, { instanceId: write.instanceId, fieldName: write.fieldName, locale: write.locale }, write.value),
		values
	);
}

/** Returns an error message, or null when the draft was written. */
async function writeFields(target: string, writes: FieldWrite[]): Promise<string | null> {
	if (target === GLOBALS_TARGET) {
		const globals = await readGlobalsValues();
		const next = setValues({ [GLOBALS_TARGET]: globals }, writes)[GLOBALS_TARGET] as SchemaValues;
		if (!(await saveGlobalsDraft(next))) return "Could not save the global variables draft in this browser.";
		notifyGlobalsDraftReplaced();
		return null;
	}
	const result = await updatePageDraft(target, (values) => setValues(values, writes));
	return result.ok ? null : (result.errorMessage ?? "Could not update the page draft.");
}

export type UndoResult = {
	/** Fields put back. */
	restored: number;
	/** Fields left alone because they were edited again after the agent changed them. */
	skipped: EditedField[];
	errorMessage: string | null;
};

/** Puts back the previous values of an edit, except fields someone changed since. */
export async function undoEdit(edit: EditRecord): Promise<UndoResult> {
	const isGlobals = edit.target === GLOBALS_TARGET;
	const page = isGlobals ? undefined : findSitePage(edit.target);
	if (!isGlobals && !page) return { restored: 0, skipped: [], errorMessage: `The page "${edit.target}" no longer exists.` };

	let current: PageEditorValuesByInstance;
	if (isGlobals) {
		current = { [GLOBALS_TARGET]: await readGlobalsValues() };
	} else {
		const result = await readPageValues(page!);
		if (result.errorMessage) return { restored: 0, skipped: [], errorMessage: result.errorMessage };
		current = result.values;
	}

	const skipped: EditedField[] = [];
	const writes: FieldWrite[] = [];
	for (const field of edit.fields) {
		const now = current[field.instanceId]?.[field.fieldName]?.[field.locale];
		if (valuesEqual(now, field.after)) writes.push({ ...field, value: field.before });
		else if (!valuesEqual(now, field.before)) skipped.push(field);
	}
	if (writes.length === 0) return { restored: 0, skipped, errorMessage: null };

	const errorMessage = await writeFields(edit.target, writes);
	return { restored: errorMessage ? 0 : writes.length, skipped, errorMessage };
}
