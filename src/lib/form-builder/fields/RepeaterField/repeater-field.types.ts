import type { FieldBuilder, RepeaterFieldDefinition, RepeaterItem } from "../../core/types";

export type { RepeaterFieldDefinition, RepeaterItem };

export interface RepeaterFieldBuilder extends FieldBuilder<RepeaterFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	itemName(value: string): this;
	itemPluralName(value: string): this;
	minItems(count: number): this;
	maxItems(count: number): this;
	defaultValue(items: Record<string, unknown>[]): this;
}
