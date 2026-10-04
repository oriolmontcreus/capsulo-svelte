import type { FieldAdornment, FieldCondition } from "../../core/types";
import type { TextFieldBuilder, TextFieldDefinition, TextInputType } from "./text-field.types";
import { assertNonNegativeInteger, assertRange, assertValidRegex } from "../../core/builder-asserts";

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

	required(value: FieldCondition = true): this {
		this.field.required = value;
		return this;
	}

	hidden(value: FieldCondition = true): this {
		this.field.hidden = value;
		return this;
	}

	defaultValue(value: string | number): this {
		this.field.defaultValue = value;
		return this;
	}

	translatable(value = true): this {
		this.field.translatable = value;
		return this;
	}

	type(value: TextInputType): this {
		this.field.inputType = value;
		return this;
	}

	minLength(value: number): this {
		assertNonNegativeInteger(`Text("${this.field.name}").minLength`, value);
		this.field.minLength = value;
		return this;
	}

	maxLength(value: number): this {
		assertNonNegativeInteger(`Text("${this.field.name}").maxLength`, value);
		this.field.maxLength = value;
		return this;
	}

	min(value: number): this {
		this.field.min = value;
		return this;
	}

	max(value: number): this {
		this.field.max = value;
		return this;
	}

	step(value: number): this {
		if (!(value > 0)) throw new RangeError(`Text("${this.field.name}").step() needs a positive number, got ${value}.`);
		this.field.step = value;
		return this;
	}

	allowDecimals(value = true): this {
		this.field.allowDecimals = value;
		return this;
	}

	regex(value: string | RegExp): this {
		assertValidRegex(`Text("${this.field.name}").regex`, value);
		this.field.regex = value;
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

	build(): TextFieldDefinition {
		const { name, minLength, maxLength, min, max, inputType, defaultValue } = this.field;
		assertRange(`Text("${name}")`, "minLength", minLength, "maxLength", maxLength);
		assertRange(`Text("${name}")`, "min", min, "max", max);
		if (inputType === "number" && typeof defaultValue === "string") {
			throw new TypeError(`Text("${name}") is a number field; give defaultValue() a number.`);
		}
		if (inputType !== "number" && typeof defaultValue === "number") {
			throw new TypeError(`Text("${name}").defaultValue() takes a number only with .type("number").`);
		}
		return { ...this.field };
	}
}

export const Text = (name: string): TextFieldBuilder =>
	new TextFieldBuilderImpl(name);
