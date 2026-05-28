export type FieldType = "text" | "textarea" | "rich-editor";

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

export type FieldDefinition =
	| TextFieldDefinition
	| TextareaFieldDefinition
	| RichEditorFieldDefinition;

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
