import type { FieldBuilder, ToggleFieldDefinition } from "../../core/types";

export type { ToggleFieldDefinition };

export interface ToggleFieldBuilder extends FieldBuilder<ToggleFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	required(value?: boolean): this;
	defaultValue(value: boolean): this;
}
