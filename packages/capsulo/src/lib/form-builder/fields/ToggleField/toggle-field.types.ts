import type { FieldCondition, FieldBuilder, ToggleFieldDefinition } from "../../core/types";

export type { ToggleFieldDefinition };

export interface ToggleFieldBuilder extends FieldBuilder<ToggleFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	required(value?: FieldCondition): this;
	hidden(value?: FieldCondition): this;
	defaultValue(value: boolean): this;
}
