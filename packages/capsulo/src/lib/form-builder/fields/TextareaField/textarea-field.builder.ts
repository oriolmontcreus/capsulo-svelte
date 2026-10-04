import type { FieldAdornment, FieldCondition } from "../../core/types";
import type { TextareaFieldBuilder, TextareaFieldDefinition, TextareaResize } from "./textarea-field.types";
import { assertNonNegativeInteger, assertRange, assertValidRegex } from "../../core/builder-asserts";

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

	required(value: FieldCondition = true): this {
		this.field.required = value;
		return this;
	}

	hidden(value: FieldCondition = true): this {
		this.field.hidden = value;
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

	minLength(value: number): this {
		assertNonNegativeInteger(`Textarea("${this.field.name}").minLength`, value);
		this.field.minLength = value;
		return this;
	}

	maxLength(value: number): this {
		assertNonNegativeInteger(`Textarea("${this.field.name}").maxLength`, value);
		this.field.maxLength = value;
		return this;
	}

	regex(value: string | RegExp): this {
		assertValidRegex(`Textarea("${this.field.name}").regex`, value);
		this.field.regex = value;
		return this;
	}

	resize(value: TextareaResize): this {
		this.field.resize = value;
		return this;
	}

	minRows(value: number): this {
		assertNonNegativeInteger(`Textarea("${this.field.name}").minRows`, value);
		this.field.minRows = value;
		return this;
	}

	maxRows(value: number): this {
		assertNonNegativeInteger(`Textarea("${this.field.name}").maxRows`, value);
		this.field.maxRows = value;
		return this;
	}

	prefix(value: FieldAdornment): this {
		this.field.prefix = value;
		return this;
	}

	suffix(value: FieldAdornment): this {
		this.field.suffix = value;
		return this;
	}

	build(): TextareaFieldDefinition {
		const { name, minLength, maxLength, minRows, maxRows } = this.field;
		assertRange(`Textarea("${name}")`, "minLength", minLength, "maxLength", maxLength);
		assertRange(`Textarea("${name}")`, "minRows", minRows, "maxRows", maxRows);
		return { ...this.field };
	}
}

export const Textarea = (name: string): TextareaFieldBuilder =>
	new TextareaFieldBuilderImpl(name);