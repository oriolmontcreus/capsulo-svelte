export type FieldType =
	| "text"
	| "textarea"
	| "rich-editor"
	| "toggle"
	| "select"
	| "colorpicker"
	| "file-upload"
	| "repeater";

export interface BaseFieldDefinition {
	type: FieldType;
	name: string;
	label?: string;
	description?: string;
	required?: boolean;
	translatable?: boolean;
}

export interface TextFieldDefinition extends BaseFieldDefinition {
	type: "text";
	placeholder?: string;
	defaultValue?: string;
}

export interface TextareaFieldDefinition extends BaseFieldDefinition {
	type: "textarea";
	placeholder?: string;
	defaultValue?: string;
	rows?: number;
	autoresize?: boolean;
	maxLength?: number;
}

export interface RichEditorFieldDefinition extends BaseFieldDefinition {
	type: "rich-editor";
	placeholder?: string;
	defaultValue?: string;
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
export type FieldValue = string | boolean | string[] | RepeaterItem[];
