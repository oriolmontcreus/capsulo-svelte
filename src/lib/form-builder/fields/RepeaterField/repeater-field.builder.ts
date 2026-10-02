import type { BuildableField, FieldDefinition } from "../../core/types";
import type { RepeaterFieldBuilder, RepeaterFieldDefinition } from "./repeater-field.types";

function assertCount(method: string, count: number): void {
	if (!Number.isInteger(count) || count < 0) {
		throw new RangeError(`Repeater.${method}() needs a non-negative integer, got ${count}.`);
	}
}

class RepeaterFieldBuilderImpl implements RepeaterFieldBuilder {
	private field: RepeaterFieldDefinition;

	constructor(name: string, fields: BuildableField[]) {
		this.field = {
			type: "repeater",
			name,
			fields: fields.map((field): FieldDefinition => ("build" in field ? field.build() : field)),
		};
	}

	label(value: string): this {
		this.field.label = value;
		return this;
	}

	description(value: string): this {
		this.field.description = value;
		return this;
	}

	itemName(value: string): this {
		this.field.itemName = value;
		return this;
	}

	itemPluralName(value: string): this {
		this.field.itemPluralName = value;
		return this;
	}

	minItems(count: number): this {
		assertCount("minItems", count);
		if (this.field.maxItems !== undefined && count > this.field.maxItems) {
			throw new RangeError(`Repeater.minItems(${count}) is above maxItems (${this.field.maxItems}).`);
		}
		this.field.minItems = count;
		return this;
	}

	maxItems(count: number): this {
		assertCount("maxItems", count);
		if (this.field.minItems !== undefined && count < this.field.minItems) {
			throw new RangeError(`Repeater.maxItems(${count}) is below minItems (${this.field.minItems}).`);
		}
		this.field.maxItems = count;
		return this;
	}

	defaultValue(items: Record<string, unknown>[]): this {
		if (!Array.isArray(items)) {
			throw new TypeError("Repeater.defaultValue() needs an array of items.");
		}
		this.field.defaultValue = items;
		return this;
	}

	build(): RepeaterFieldDefinition {
		const { defaultValue, maxItems } = this.field;
		if (defaultValue && maxItems !== undefined && defaultValue.length > maxItems) {
			throw new RangeError(
				`Repeater "${this.field.name}" has ${defaultValue.length} default items but maxItems is ${maxItems}.`,
			);
		}
		return { ...this.field };
	}
}

/**
 * A list of items that each hold the given fields, e.g. cards, team members or FAQ entries.
 * Items are shared by every locale; mark child fields `.translatable()` to translate them.
 */
export const Repeater = (name: string, fields: BuildableField[]): RepeaterFieldBuilder =>
	new RepeaterFieldBuilderImpl(name, fields);
