import type {
	FieldCondition,
	FieldBuilder,
	RichEditorFieldDefinition,
} from "../../core/types";

export type { RichEditorFieldDefinition };

export interface RichEditorFieldBuilder
	extends FieldBuilder<RichEditorFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	placeholder(value: string): this;
	required(value?: FieldCondition): this;
	hidden(value?: FieldCondition): this;
	defaultValue(value: string): this;
	translatable(value?: boolean): this;
	/** Minimum visible-text length (markup not counted). */
	minLength(value: number): this;
	/** Maximum visible-text length (markup not counted). */
	maxLength(value: number): this;
}

