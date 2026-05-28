import type { TextareaFieldBuilder, TextareaFieldDefinition } from "./textarea-field.types";

class TextareaFieldBuilderImpl implements TextareaFieldBuilder {
	private field: TextareaFieldDefinition;

	constructor(name: string) {
		this.field = {
			type: "textarea",
			name
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

	rows(value: number): this {
		this.field.rows = value;
		return this;
	}

	autoresize(value = true): this {
		this.field.autoresize = value;
		return this;
	}

	maxLength(value: number): this {
		this.field.maxLength = value;
		return this;
	}

	build(): TextareaFieldDefinition {
		return { ...this.field };
	}
}

export const Textarea = (name: string): TextareaFieldBuilder =>
	new TextareaFieldBuilderImpl(name);