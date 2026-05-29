export type FieldType = "text" | "textarea" | "rich-editor" | "toggle" | "select";

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
	defaultValue?: string;
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

export type FieldDefinition =
	| TextFieldDefinition
	| TextareaFieldDefinition
	| RichEditorFieldDefinition
	| ToggleFieldDefinition
	| SelectFieldDefinition;

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
