import type {
	BuildableField,
	FieldBuilder,
	FieldDefinition,
	SchemaDefinition
} from "./types";

export interface CreateSchemaInput<TField extends FieldDefinition = FieldDefinition> {
	name: string;
	key: string;
	description?: string;
	fields: BuildableField<TField>[];
}

function isFieldBuilder<TField extends FieldDefinition>(
	field: BuildableField<TField>
): field is FieldBuilder<TField> {
	return typeof field === "object" && field !== null && "build" in field;
}

export function createSchema<TField extends FieldDefinition = FieldDefinition>(
	input: CreateSchemaInput<TField>
): SchemaDefinition<TField> {
	const fields = input.fields.map((field) =>
		isFieldBuilder(field) ? field.build() : field
	);

	return {
		name: input.name,
		key: input.key,
		description: input.description,
		fields
	};
}
