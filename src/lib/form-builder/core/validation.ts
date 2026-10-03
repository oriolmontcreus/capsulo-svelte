/**
 * The one content validator. The editor (inline errors), the Changes page (commit gate), the
 * AI agent and the Worker API all run it, so "required" means the same thing everywhere.
 * Plain TypeScript with no Svelte or browser imports: the server bundles it too.
 */
import { colorPickerFieldValidator } from "../fields/ColorPickerField/color-picker-field.validation";
import { fileUploadFieldValidator } from "../fields/FileUploadField/file-upload-field.validation";
import { repeaterFieldValidator } from "../fields/RepeaterField/repeater-field.validation";
import { richEditorFieldValidator } from "../fields/RichEditorField/rich-editor-field.validation";
import { selectFieldValidator } from "../fields/SelectField/select-field.validation";
import { textFieldValidator } from "../fields/TextField/text-field.validation";
import { textareaFieldValidator } from "../fields/TextareaField/textarea-field.validation";
import { toggleFieldValidator } from "../fields/ToggleField/toggle-field.validation";
import { isFieldHidden, isFieldRequired, resolveConditionValues } from "./conditions";
import { normalizeRepeaterItems, repeaterItemValues, resolveFieldValue } from "./translation-runtime";
import type { FieldDefinition, FieldType, SchemaDefinition, SchemaValues } from "./types";
import { fieldLabel } from "./validation-helpers";
import { t } from "$lib/admin-i18n/core";

export interface FieldValidator<TField extends FieldDefinition> {
	/** Whether the value counts as "not filled in" for `required`. */
	isEmpty(field: TField, value: unknown): boolean;
	/** Format rules for a filled-in value: an error message, or null when it's fine. */
	validate(field: TField, value: unknown): string | null;
	/** Message when a required field is empty. Defaults to "<Label> is required." */
	requiredMessage?(field: TField): string;
	/** Run `validate` on empty values too (repeater item counts). */
	alwaysValidate?: boolean;
}

export interface ValidationIssue {
	/** Field names and repeater item ids from the schema root, e.g. ["cards", "card-1", "title"]. */
	path: string[];
	fieldName: string;
	label: string;
	locale: string;
	kind: "required" | "invalid";
	message: string;
}

export interface ValidationOptions {
	defaultLocale: string;
	/** Locales whose values get format checks. Defaults to the locales present in the content. */
	locales?: string[];
}

type ValidatorRegistry = { [K in FieldType]: FieldValidator<Extract<FieldDefinition, { type: K }>> };

const validators: ValidatorRegistry = {
	text: textFieldValidator,
	textarea: textareaFieldValidator,
	"rich-editor": richEditorFieldValidator,
	toggle: toggleFieldValidator,
	select: selectFieldValidator,
	colorpicker: colorPickerFieldValidator,
	"file-upload": fileUploadFieldValidator,
	repeater: repeaterFieldValidator,
};

function getValidator(field: FieldDefinition): FieldValidator<FieldDefinition> | undefined {
	return validators[field.type] as FieldValidator<FieldDefinition> | undefined;
}

/** True when `value` counts as empty for the field's `required` check. */
function isFieldValueEmpty(field: FieldDefinition, value: unknown): boolean {
	return getValidator(field)?.isEmpty(field, value) ?? (value === undefined || value === null || value === "");
}

/**
 * Checks one plain value (one locale) against the field's format rules. Empty values pass:
 * whether they're allowed is the `required` check's job. Repeater items are not recursed.
 */
export function validateFieldValue(field: FieldDefinition, value: unknown): string | null {
	const validator = getValidator(field);
	if (!validator) return null;
	if (!validator.alwaysValidate && validator.isEmpty(field, value)) return null;
	return validator.validate(field, value);
}

function requiredMessage(field: FieldDefinition): string {
	return getValidator(field)?.requiredMessage?.(field) ?? t("validation.required", { label: fieldLabel(field) });
}

/** Locales a field's values are stored under: translatable fields have one per locale. */
function localesToCheck(field: FieldDefinition, stored: Record<string, unknown>, options: ValidationOptions): string[] {
	if (!field.translatable || field.type === "toggle" || field.type === "repeater") return [options.defaultLocale];
	const locales = options.locales ?? Object.keys(stored);
	return [options.defaultLocale, ...locales.filter((locale) => locale !== options.defaultLocale)];
}

/**
 * Validates a list of fields. Hidden fields are skipped (their children too). Required fields
 * must be filled in the default locale; every stored locale must pass the format rules.
 */
function validateFields(
	fields: FieldDefinition[],
	values: SchemaValues,
	options: ValidationOptions,
	path: string[] = [],
): ValidationIssue[] {
	const issues: ValidationIssue[] = [];
	const conditionValues = resolveConditionValues(fields, values, options.defaultLocale);

	for (const field of fields) {
		if (isFieldHidden(field, conditionValues)) continue;

		const fieldPath = [...path, field.name];
		const stored = (values[field.name] ?? {}) as Record<string, unknown>;
		const issue = (locale: string, kind: ValidationIssue["kind"], message: string) =>
			issues.push({ path: fieldPath, fieldName: field.name, label: fieldLabel(field), locale, kind, message });

		for (const locale of localesToCheck(field, stored, options)) {
			const isDefault = locale === options.defaultLocale;
			const value = isDefault
				? resolveFieldValue(field, stored, options.defaultLocale, options.defaultLocale)
				: stored[locale];
			// A translation that was never written falls back to the default locale on the site.
			if (!isDefault && value === undefined) continue;

			if (isDefault && isFieldRequired(field, conditionValues) && isFieldValueEmpty(field, value)) {
				issue(locale, "required", requiredMessage(field));
				continue;
			}
			const message = validateFieldValue(field, value);
			if (message) issue(locale, "invalid", message);
		}

		if (field.type === "repeater") {
			const items = normalizeRepeaterItems(stored[options.defaultLocale]);
			for (const item of items) {
				issues.push(
					...validateFields(field.fields, repeaterItemValues(item), options, [...fieldPath, item._id]),
				);
			}
		}
	}

	return issues;
}

export function validateSchemaValues(
	schema: Pick<SchemaDefinition, "fields">,
	values: SchemaValues,
	options: ValidationOptions,
): ValidationIssue[] {
	return validateFields(schema.fields, values, options);
}

/** Stable key for looking up the issue of one rendered field: "cards.card-1.title@en". */
export function validationIssueKey(path: string[], locale: string): string {
	return `${path.join(".")}@${locale}`;
}
