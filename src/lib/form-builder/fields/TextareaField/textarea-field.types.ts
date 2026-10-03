import type {
	FieldAdornment,
	FieldBuilder,
	FieldCondition,
	TextareaFieldDefinition,
	TextareaResize,
} from "../../core/types";

export type { TextareaFieldDefinition, TextareaResize };

export interface TextareaFieldBuilder extends FieldBuilder<TextareaFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	placeholder(value: string): this;
	required(value?: FieldCondition): this;
	hidden(value?: FieldCondition): this;
	defaultValue(value: string): this;
	translatable(value?: boolean): this;
	rows(value: number): this;
	autoresize(value?: boolean): this;
	minLength(value: number): this;
	maxLength(value: number): this;
	regex(value: string | RegExp): this;
	resize(value: TextareaResize): this;
	minRows(value: number): this;
	maxRows(value: number): this;
	prefix(value: FieldAdornment): this;
	suffix(value: FieldAdornment): this;
}
