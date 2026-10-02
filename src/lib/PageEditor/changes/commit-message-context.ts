import type { FieldDefinition, RepeaterFieldDefinition, SelectFieldDefinition } from "$lib/form-builder/core/types";
import type { PageChangeSet } from "./diff-model";
import { diffRepeaterItems, repeaterItemTitle } from "./repeater-diff";

/** Per value: enough to tell what changed without sending whole articles to the model. */
const MAX_VALUE_CHARS = 160;
/** The whole description, so a big commit stays well inside the model's free quota. */
const MAX_DESCRIPTION_CHARS = 12_000;

export type ChangedPageForDescription = {
	name: string;
	changeSet: PageChangeSet;
};

export type CapsuleInfo = {
	title: string;
	fields: FieldDefinition[];
};

export type DescribeChangesOptions = {
	/** The capsule an instance belongs to (display name and field definitions). */
	resolveCapsule: (instanceId: string) => CapsuleInfo | undefined;
	/** Locale tags are only shown for translations, not for the default locale. */
	defaultLocale: string;
};

function truncate(text: string, maxLength: number): string {
	return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function plainText(html: string): string {
	return html
		.replace(/<(br|\/p|\/li|\/h[1-6])\s*\/?>/gi, " ")
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

function selectLabel(field: SelectFieldDefinition, value: string): string {
	const options = [...(field.options ?? []), ...(field.groups ?? []).flatMap((group) => group.options)];
	return options.find((option) => option.value === value)?.label ?? value;
}

function fileName(path: string): string {
	return path.split("/").pop() ?? path;
}

/** One side of a field change as short, quoted, single-line text. */
export function formatValue(value: unknown, field: FieldDefinition | undefined): string {
	if (value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
		return "(empty)";
	}
	if (field?.type === "toggle") return value ? "on" : "off";

	let text: string;
	if (field?.type === "select") {
		const values = Array.isArray(value) ? value : [value];
		text = values.map((entry) => selectLabel(field, String(entry))).join(", ");
	} else if (field?.type === "file-upload") {
		const values = Array.isArray(value) ? value : [value];
		text = values.map((entry) => fileName(String(entry))).join(", ");
	} else if (typeof value === "string") {
		text = field?.type === "rich-editor" ? plainText(value) : value;
	} else {
		text = typeof value === "object" ? JSON.stringify(value) : String(value);
	}
	return JSON.stringify(truncate(text.replace(/\s+/g, " ").trim(), MAX_VALUE_CHARS));
}

/** A repeater change as item operations: `added "A"; edited "B" (Title, Body (en)); moved "C"`. */
function describeRepeaterChange(
	field: RepeaterFieldDefinition,
	oldValue: unknown,
	newValue: unknown,
	defaultLocale: string
): string {
	const parts = diffRepeaterItems(field, oldValue, newValue).map((change) => {
		const title = JSON.stringify(truncate(repeaterItemTitle(field, change.item, change.index, defaultLocale), 60));
		if (change.kind !== "changed") return `${change.kind} ${title}`;
		const edited = [
			...new Set(
				change.changes.map(
					(child) =>
						`${child.field.label ?? child.field.name}${child.locale === defaultLocale ? "" : ` (${child.locale})`}`
				)
			),
		];
		const actions = [edited.length ? `edited ${title} (${edited.join(", ")})` : "", change.moved ? `moved ${title}` : ""];
		return actions.filter(Boolean).join(", ");
	});
	return truncate(parts.join("; ") || "reordered", MAX_VALUE_CHARS * 2);
}

/**
 * Turns the pending change sets into the compact text the commit-message model reads:
 *
 *     Page "Home"
 *       Hero [new]
 *         Title: (empty) → "Welcome"
 *         Title (es): (empty) → "Bienvenido"
 */
export function describeChanges(pages: ChangedPageForDescription[], options: DescribeChangesOptions): string {
	const lines: string[] = [];
	let length = 0;
	let omitted = 0;

	const push = (line: string): boolean => {
		if (length + line.length + 1 > MAX_DESCRIPTION_CHARS) return false;
		lines.push(line);
		length += line.length + 1;
		return true;
	};

	for (const page of pages) {
		const fieldCount = page.changeSet.instances.reduce((total, instance) => total + instance.fields.length, 0);
		if (fieldCount === 0) continue;
		if (!push(`Page "${page.name}"`)) {
			omitted += fieldCount;
			continue;
		}

		for (const instance of page.changeSet.instances) {
			const capsule = options.resolveCapsule(instance.instanceId);
			const flag = instance.isNew ? " [new]" : instance.isRemoved ? " [removed]" : "";
			if (!push(`  ${capsule?.title ?? instance.instanceId}${flag}`)) {
				omitted += instance.fields.length;
				continue;
			}

			for (const change of instance.fields) {
				const field = capsule?.fields.find((entry) => entry.name === change.fieldName);
				const label = field?.label ?? change.fieldName;
				const locale = change.locale === options.defaultLocale ? "" : ` (${change.locale})`;
				const line =
					field?.type === "repeater"
						? `    ${label}: ${describeRepeaterChange(field, change.oldValue, change.newValue, options.defaultLocale)}`
						: `    ${label}${locale}: ${formatValue(change.oldValue, field)} → ${formatValue(change.newValue, field)}`;
				if (!push(line)) omitted += 1;
			}
		}
	}

	if (omitted > 0) lines.push(`…and ${omitted} more field change${omitted === 1 ? "" : "s"}.`);
	return lines.join("\n");
}
