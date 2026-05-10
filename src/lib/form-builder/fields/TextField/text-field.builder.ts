import type { TextFieldBuilder, TextFieldDefinition } from "./text-field.types";

class TextFieldBuilderImpl implements TextFieldBuilder {
	private field: TextFieldDefinition;

	constructor(name: string) {
		this.field = {
			type: "text",
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

	build(): TextFieldDefinition {
		return { ...this.field };
	}
}

export const TextField = (name: string): TextFieldBuilder =>
	new TextFieldBuilderImpl(name);
