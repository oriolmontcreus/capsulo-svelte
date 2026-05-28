import type {
	FieldBuilder,
	RichEditorFieldDefinition,
} from "../../core/types";

export type { RichEditorFieldDefinition };

export interface RichEditorFieldBuilder
	extends FieldBuilder<RichEditorFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	placeholder(value: string): this;
	required(value?: boolean): this;
	defaultValue(value: string): this;
	translatable(value?: boolean): this;
}

