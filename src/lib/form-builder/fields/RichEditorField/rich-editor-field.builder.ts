import type {
	RichEditorFieldBuilder,
	RichEditorFieldDefinition,
} from "./rich-editor-field.types";

class RichEditorFieldBuilderImpl implements RichEditorFieldBuilder {
	private field: RichEditorFieldDefinition;

	constructor(name: string) {
		this.field = {
			type: "rich-editor",
			name,
		};
	}

	label(value: string): this {
		this.field.label = value;
		return this;
	}

	description(value: string): this {
		this.field.description = value;
		return this;
	}

	placeholder(value: string): this {
		this.field.placeholder = value;
		return this;
	}

	required(value = true): this {
		this.field.required = value;
		return this;
	}

	defaultValue(value: string): this {
		this.field.defaultValue = value;
		return this;
	}

	translatable(value = true): this {
		this.field.translatable = value;
		return this;
	}

	build(): RichEditorFieldDefinition {
		return { ...this.field };
	}
}

export const RichEditorField = (name: string): RichEditorFieldBuilder =>
	new RichEditorFieldBuilderImpl(name);

