import type {
	FieldAdornment,
	FieldBuilder,
	FieldCondition,
	TextFieldDefinition,
	TextInputType,
} from "../../core/types";

export type { TextFieldDefinition, TextInputType };

export interface TextFieldBuilder extends FieldBuilder<TextFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	placeholder(value: string): this;
	required(value?: FieldCondition): this;
	hidden(value?: FieldCondition): this;
	defaultValue(value: string | number): this;
	translatable(value?: boolean): this;
	/** "email" and "url" check the format; "number" stores a JSON number. */
	type(value: TextInputType): this;
	minLength(value: number): this;
	maxLength(value: number): this;
	min(value: number): this;
	max(value: number): this;
	step(value: number): this;
	allowDecimals(value?: boolean): this;
	regex(value: string | RegExp): this;
	prefix(value: FieldAdornment): this;
	suffix(value: FieldAdornment): this;
}
