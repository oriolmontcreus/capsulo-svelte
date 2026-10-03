import type { FieldCondition, FieldBuilder, ColorPickerFieldDefinition } from "../../core/types";

export type { ColorPickerFieldDefinition };

export interface ColorPickerFieldBuilder extends FieldBuilder<ColorPickerFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	required(value?: FieldCondition): this;
	hidden(value?: FieldCondition): this;
	defaultValue(value: string): this;
	showAlpha(value?: boolean): this;
	presetColors(colors: string[], onlyPresets?: boolean): this;
	translatable(value?: boolean): this;
}