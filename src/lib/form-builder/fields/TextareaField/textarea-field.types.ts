import type { FieldBuilder, TextareaFieldDefinition } from "../../core/types";

export type { TextareaFieldDefinition };

export interface TextareaFieldBuilder extends FieldBuilder<TextareaFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	placeholder(value: string): this;
	required(value?: boolean): this;
	defaultValue(value: string): this;
	translatable(value?: boolean): this;
	rows(value: number): this;
	autoresize(value?: boolean): this;
	maxLength(value: number): this;
}