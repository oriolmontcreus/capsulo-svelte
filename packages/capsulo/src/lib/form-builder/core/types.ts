import type { Component } from "svelte";

export type FieldType =
	| "text"
	| "textarea"
	| "rich-editor"
	| "toggle"
	| "select"
	| "colorpicker"
	| "file-upload"
	| "repeater";

/**
 * Values a field condition sees: each sibling field's value in the default locale
 * (inside a repeater item, the item's own fields).
 */
export type ConditionValues = Record<string, unknown>;

/** A fixed flag, or a function of the sibling values (e.g. `(values) => values.showCta === true`). */
export type FieldCondition = boolean | ((values: ConditionValues) => boolean);

/** Text or a Svelte component (e.g. an icon) shown before or after an input. */
export type FieldAdornment = string | Component;

export interface BaseFieldDefinition {
	type: FieldType;
	name: string;
	label?: string;
	description?: string;
	/** Required fields must have a value in the default locale before content can be committed. */
	required?: FieldCondition;
	/** Hidden fields are not shown or validated; their stored value is kept. */
	hidden?: FieldCondition;
	translatable?: boolean;
}

export type TextInputType = "text" | "email" | "url" | "password" | "number";

export interface TextFieldDefinition extends BaseFieldDefinition {
	type: "text";
	placeholder?: string;
	/** A number for `inputType: "number"`, a string otherwise. */
	defaultValue?: string | number;
	/** Defaults to "text". "number" stores a JSON number (or null when empty). */
	inputType?: TextInputType;
	minLength?: number;
	maxLength?: number;
	/** Smallest allowed number (`inputType: "number"`). */
	min?: number;
	/** Largest allowed number (`inputType: "number"`). */
	max?: number;
	/** Allowed increment for numbers, e.g. 0.01 for two decimals. */
	step?: number;
	/** `false` allows whole numbers only. */
	allowDecimals?: boolean;
	/** The whole value must match this pattern. */
	regex?: string | RegExp;
	prefix?: FieldAdornment;
	suffix?: FieldAdornment;
}

export type TextareaResize = "none" | "vertical" | "horizontal" | "both";

export interface TextareaFieldDefinition extends BaseFieldDefinition {
	type: "textarea";
	placeholder?: string;
	defaultValue?: string;
	rows?: number;
	autoresize?: boolean;
	minLength?: number;
	maxLength?: number;
	/** The whole value must match this pattern. */
	regex?: string | RegExp;
	resize?: TextareaResize;
	/** Lower height bound, in rows, when auto-resizing. */
	minRows?: number;
	/** Upper height bound, in rows, when auto-resizing. */
	maxRows?: number;
	prefix?: FieldAdornment;
	suffix?: FieldAdornment;
}

export interface RichEditorFieldDefinition extends BaseFieldDefinition {
	type: "rich-editor";
	placeholder?: string;
	defaultValue?: string;
	/** Minimum length of the visible text (markup not counted). */
	minLength?: number;
	/** Maximum length of the visible text (markup not counted). */
	maxLength?: number;
}

export interface ToggleFieldDefinition extends BaseFieldDefinition {
	type: "toggle";
	defaultValue?: boolean;
}

export interface SelectOption {
	label: string;
	value: string;
	disabled?: boolean;
	description?: string;
}

export interface SelectOptionGroup {
	label: string;
	options: SelectOption[];
}

export interface ResponsiveColumns {
	base?: number;
	sm?: number;
	md?: number;
	lg?: number;
	xl?: number;
}

export interface InternalLinksConfig {
	autoResolveLocale?: boolean;
	groupBySection?: boolean;
}

export interface SelectFieldDefinition extends BaseFieldDefinition {
	type: "select";
	placeholder?: string;
	multiple?: boolean;
	defaultValue?: string | string[];
	options?: SelectOption[];
	groups?: SelectOptionGroup[];
	searchable?: boolean;
	searchPlaceholder?: string;
	emptyMessage?: string;
	columns?: number | ResponsiveColumns;
	highlightMatches?: boolean;
	minSearchLength?: number;
	internalLinks?: InternalLinksConfig;
	colSpan?: number | "full" | ResponsiveColumns;
}

export interface ColorPickerFieldDefinition extends BaseFieldDefinition {
	type: "colorpicker";
	defaultValue?: string;
	showAlpha?: boolean;
	presetColors?: string[];
	onlyPresets?: boolean;
}

export interface FileUploadFieldDefinition extends BaseFieldDefinition {
	type: "file-upload";
	defaultValue?: string[];
	accept?: string;
	maxSize?: number;
	maxFiles?: number;
	multiple?: boolean;
	colSpan?: number | "full" | ResponsiveColumns;
}

export interface RepeaterFieldDefinition extends BaseFieldDefinition {
	type: "repeater";
	/** Fields of each item. An item stores them like a schema does: field -> locale map. */
	fields: FieldDefinition[];
	/** Singular name for one item, e.g. "Card" ("Add Card"). */
	itemName?: string;
	/** Plural name for the items, e.g. "Cards" ("No Cards yet"). */
	itemPluralName?: string;
	minItems?: number;
	maxItems?: number;
	/** Initial items as plain child values (`[{ title: "Hi" }]`), written to the default locale. */
	defaultValue?: Record<string, unknown>[];
}

export type FieldDefinition =
	| TextFieldDefinition
	| TextareaFieldDefinition
	| RichEditorFieldDefinition
	| ToggleFieldDefinition
	| SelectFieldDefinition
	| ColorPickerFieldDefinition
	| FileUploadFieldDefinition
	| RepeaterFieldDefinition;

export interface FieldBuilder<TField extends FieldDefinition = FieldDefinition> {
	build(): TField;
}

export type BuildableField<TField extends FieldDefinition = FieldDefinition> =
	| TField
	| FieldBuilder<TField>;

export interface SchemaDefinition<TField extends FieldDefinition = FieldDefinition> {
	name: string;
	key: string;
	description?: string;
	fields: TField[];
}

export type LocalizedFieldValue<TValue = string> = Partial<Record<string, TValue>>;
export type SchemaValues = Record<string, LocalizedFieldValue<unknown>>;
export type ResolvedSchemaValues = Record<string, unknown | undefined>;

/**
 * One repeater item as stored: a stable id plus the item's field values, each a locale map
 * exactly like a schema's top-level values. Item order and ids are shared by every locale.
 */
export interface RepeaterItem {
	_id: string;
	[fieldName: string]: unknown;
}

/** What a field component receives and emits. */
export type FieldValue = string | number | null | boolean | string[] | RepeaterItem[];
