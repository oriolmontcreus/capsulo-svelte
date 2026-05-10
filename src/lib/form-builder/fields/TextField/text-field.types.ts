import type { FieldBuilder, TextFieldDefinition } from "../../core/types";

export type { TextFieldDefinition };

export interface TextFieldBuilder extends FieldBuilder<TextFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	placeholder(value: string): this;
	required(value?: boolean): this;
	defaultValue(value: string): this;
}
