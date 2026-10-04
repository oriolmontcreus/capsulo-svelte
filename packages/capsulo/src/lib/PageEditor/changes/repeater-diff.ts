import { normalizeRepeaterItems } from "../../form-builder/core/translation-runtime";
import type { FieldDefinition, RepeaterFieldDefinition, RepeaterItem } from "../../form-builder/core/types";
import {
	getRepeaterItemSummary,
	repeaterItemLabel,
} from "../../form-builder/fields/RepeaterField/modules/repeater-values";
import { valuesEqual } from "./diff-model";

/** One child field of an item that differs, for one locale. */
export type RepeaterChildChange = {
	field: FieldDefinition;
	locale: string;
	oldValue: unknown;
	newValue: unknown;
};

export type RepeaterItemChange =
	| { kind: "added"; item: RepeaterItem; index: number }
	| { kind: "removed"; item: RepeaterItem; index: number }
	| {
			kind: "changed";
			item: RepeaterItem;
			index: number;
			oldIndex: number;
			/** Its position among the items both sides share changed. */
			moved: boolean;
			changes: RepeaterChildChange[];
	  };

function localeMap(item: RepeaterItem, fieldName: string): Record<string, unknown> {
	const value = item[fieldName];
	return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function childChanges(field: RepeaterFieldDefinition, oldItem: RepeaterItem, newItem: RepeaterItem): RepeaterChildChange[] {
	const changes: RepeaterChildChange[] = [];
	for (const child of field.fields) {
		const oldByLocale = localeMap(oldItem, child.name);
		const newByLocale = localeMap(newItem, child.name);
		const locales = new Set([...Object.keys(oldByLocale), ...Object.keys(newByLocale)]);
		for (const locale of locales) {
			if (!valuesEqual(oldByLocale[locale], newByLocale[locale])) {
				changes.push({ field: child, locale, oldValue: oldByLocale[locale], newValue: newByLocale[locale] });
			}
		}
	}
	return changes;
}

/**
 * Compares two stored item lists by item id: what was added, removed, edited or moved.
 * Items are listed in the new order, with removed items at their old position.
 */
export function diffRepeaterItems(
	field: RepeaterFieldDefinition,
	oldValue: unknown,
	newValue: unknown,
): RepeaterItemChange[] {
	const oldItems = normalizeRepeaterItems(oldValue);
	const newItems = normalizeRepeaterItems(newValue);
	const oldIndexById = new Map(oldItems.map((item, index) => [item._id, index]));
	const newIds = new Set(newItems.map((item) => item._id));

	// Relative order of the items both sides have, to tell a real move from a shift
	// caused by an insertion or deletion.
	const sharedOld = oldItems.filter((item) => newIds.has(item._id)).map((item) => item._id);
	const sharedNew = newItems.filter((item) => oldIndexById.has(item._id)).map((item) => item._id);

	const result: RepeaterItemChange[] = [];
	newItems.forEach((item, index) => {
		const oldIndex = oldIndexById.get(item._id);
		if (oldIndex === undefined) {
			result.push({ kind: "added", item, index });
			return;
		}
		const changes = childChanges(field, oldItems[oldIndex], item);
		const moved = sharedOld.indexOf(item._id) !== sharedNew.indexOf(item._id);
		if (changes.length > 0 || moved) result.push({ kind: "changed", item, index, oldIndex, moved, changes });
	});

	oldItems.forEach((item, index) => {
		if (newIds.has(item._id)) return;
		const insertAt = result.findIndex((change) => change.kind !== "removed" && "oldIndex" in change && change.oldIndex > index);
		result.splice(insertAt === -1 ? result.length : insertAt, 0, { kind: "removed", item, index });
	});

	return result;
}

/** How an item is named in diffs: its first text value, else "{itemName} N". */
export function repeaterItemTitle(
	field: RepeaterFieldDefinition,
	item: RepeaterItem,
	index: number,
	defaultLocale: string,
): string {
	return getRepeaterItemSummary(field, item, defaultLocale, defaultLocale) ?? repeaterItemLabel(field, index);
}
