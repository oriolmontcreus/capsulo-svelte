import { z } from "zod";
import type { FieldDefinition } from "../../core/types";
import type { RepeaterFieldDefinition } from "./repeater-field.types";

/**
 * Validates the stored repeater value: a locale map holding the item list, where each item
 * has an `_id` and its child values (validated with `childToZod`, so nested repeaters recurse).
 */
export function repeaterFieldToZod(
	field: RepeaterFieldDefinition,
	childToZod: (child: FieldDefinition) => z.ZodTypeAny | undefined,
) {
	const label = field.label ?? field.name;
	const itemShape: Record<string, z.ZodTypeAny> = { _id: z.string().min(1) };
	for (const child of field.fields) {
		const childSchema = childToZod(child);
		if (childSchema) itemShape[child.name] = childSchema.optional();
	}

	let items = z.array(z.looseObject(itemShape));
	if (field.minItems) {
		items = items.min(field.minItems, { message: `${label} needs at least ${field.minItems} items` });
	}
	if (field.maxItems !== undefined) {
		items = items.max(field.maxItems, { message: `${label} allows at most ${field.maxItems} items` });
	}

	return z.record(z.string(), items);
}
