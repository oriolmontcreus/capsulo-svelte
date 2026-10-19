import { normalizeRepeaterItems } from "$lib/form-builder/core/translation-runtime";
import type { FieldDefinition, RepeaterFieldDefinition, RepeaterItem } from "$lib/form-builder/core/types";
import {
	getRepeaterItemSummary,
	repeaterItemLabel,
} from "$lib/form-builder/fields/RepeaterField/modules/repeater-values";
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

/**
 * Puts `item` back where it sat in the old list: right after the closest earlier item
 * (in the old order) that is still in `items`, or first when there is none.
 */
function insertAtOldPosition(oldItems: RepeaterItem[], items: RepeaterItem[], item: RepeaterItem): RepeaterItem[] {
	const oldIndex = oldItems.findIndex((entry) => entry._id === item._id);
	for (let index = oldIndex - 1; index >= 0; index -= 1) {
		const anchor = items.findIndex((entry) => entry._id === oldItems[index]._id);
		if (anchor !== -1) return [...items.slice(0, anchor + 1), item, ...items.slice(anchor + 1)];
	}
	return [item, ...items];
}

/** Reverting an added item: the new list without it. */
export function revertAddedItem(newValue: unknown, itemId: string): RepeaterItem[] {
	return normalizeRepeaterItems(newValue).filter((item) => item._id !== itemId);
}

/**
 * Reverting a removed, edited or moved item: its old version, back at its old position.
 * Other items keep their current content and order.
 */
export function revertItem(oldValue: unknown, newValue: unknown, itemId: string): RepeaterItem[] {
	const oldItems = normalizeRepeaterItems(oldValue);
	const oldItem = oldItems.find((item) => item._id === itemId);
	const items = normalizeRepeaterItems(newValue).filter((item) => item._id !== itemId);
	return oldItem ? insertAtOldPosition(oldItems, items, oldItem) : items;
}

/**
 * Sets one child field of one item, for one locale (`undefined` clears that locale). A field
 * left with no locales is dropped when the committed item didn't have it, so a fully reverted
 * list compares equal to the committed one.
 */
export function setItemFieldValue(
	oldValue: unknown,
	newValue: unknown,
	itemId: string,
	fieldName: string,
	locale: string,
	value: unknown,
): RepeaterItem[] {
	const oldItem = normalizeRepeaterItems(oldValue).find((item) => item._id === itemId);
	return normalizeRepeaterItems(newValue).map((item) => {
		if (item._id !== itemId) return item;
		const byLocale = { ...localeMap(item, fieldName) };
		if (value === undefined) delete byLocale[locale];
		else byLocale[locale] = value;
		if (Object.keys(byLocale).length === 0 && !(oldItem && fieldName in oldItem)) {
			const { [fieldName]: _dropped, ...rest } = item;
			return rest as RepeaterItem;
		}
		return { ...item, [fieldName]: byLocale };
	});
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
