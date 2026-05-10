export type FieldType = "text";

export interface BaseFieldDefinition {
	type: FieldType;
	name: string;
	label?: string;
	description?: string;
	required?: boolean;
}

export interface TextFieldDefinition extends BaseFieldDefinition {
	type: "text";
	placeholder?: string;
	defaultValue?: string;
}

export type FieldDefinition = TextFieldDefinition;

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

export type SchemaValues = Record<string, string>;
