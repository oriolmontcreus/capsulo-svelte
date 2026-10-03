import type { FieldCondition } from "../../core/types";
import type { ColorPickerFieldBuilder, ColorPickerFieldDefinition } from "./color-picker-field.types";

class ColorPickerFieldBuilderImpl implements ColorPickerFieldBuilder {
	private field: ColorPickerFieldDefinition;

	constructor(name: string) {
		this.field = {
			type: "colorpicker",
			name,
			showAlpha: false,
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

	showAlpha(value = true): this {
		this.field.showAlpha = value;
		return this;
	}

	presetColors(colors: string[], onlyPresets = false): this {
		this.field.presetColors = colors.map((c) => c.toLowerCase());
		this.field.onlyPresets = onlyPresets;
		return this;
	}

	translatable(value = true): this {
		this.field.translatable = value;
		return this;
	}

	build(): ColorPickerFieldDefinition {
		return { ...this.field };
	}
}

export const ColorPicker = (name: string): ColorPickerFieldBuilder =>
	new ColorPickerFieldBuilderImpl(name);