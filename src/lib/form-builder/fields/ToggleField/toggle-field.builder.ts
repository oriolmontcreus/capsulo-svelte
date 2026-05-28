import type { ToggleFieldBuilder, ToggleFieldDefinition } from "./toggle-field.types";

class ToggleFieldBuilderImpl implements ToggleFieldBuilder {
	private field: ToggleFieldDefinition;

	constructor(name: string) {
		this.field = {
			type: "toggle",
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

	required(value = true): this {
		this.field.required = value;
		return this;
	}

	defaultValue(value: boolean): this {
		this.field.defaultValue = value;
		return this;
	}

	build(): ToggleFieldDefinition {
		return { ...this.field };
	}
}

export const Toggle = (name: string): ToggleFieldBuilder =>
	new ToggleFieldBuilderImpl(name);
