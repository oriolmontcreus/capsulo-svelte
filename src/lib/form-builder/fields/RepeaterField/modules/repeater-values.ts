import {
	createRepeaterItem,
	normalizeRepeaterItems,
	resolveFieldValue,
} from "../../../core/translation-runtime";
import type { RepeaterFieldDefinition, RepeaterItem } from "../../../core/types";
import { t } from "$lib/admin-i18n/core";

function createRepeaterItemId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return `item_${crypto.randomUUID()}`;
	}
	return `item_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/** A new, empty item (it doesn't use the field's `defaultValue`, which seeds the initial list). */
export function createEmptyRepeaterItem(field: RepeaterFieldDefinition, defaultLocale: string): RepeaterItem {
	return createRepeaterItem(field, defaultLocale, createRepeaterItemId());
}

/** A deep copy of the item with fresh ids, nested repeater items included. */
export function duplicateRepeaterItem(field: RepeaterFieldDefinition, item: RepeaterItem): RepeaterItem {
	// JSON round trip rather than structuredClone: the item may be a Svelte $state proxy.
	const copy: RepeaterItem = { ...(JSON.parse(JSON.stringify(item)) as RepeaterItem), _id: createRepeaterItemId() };

	for (const child of field.fields) {
		if (child.type !== "repeater") continue;
		const byLocale = copy[child.name];
		if (typeof byLocale !== "object" || byLocale === null) continue;
		copy[child.name] = Object.fromEntries(
			Object.entries(byLocale).map(([locale, items]) => [
				locale,
				normalizeRepeaterItems(items).map((nested) => duplicateRepeaterItem(child, nested)),
			]),
		);
	}

	return copy;
}

export function moveRepeaterItem<T>(items: T[], from: number, to: number): T[] {
	if (from === to || from < 0 || from >= items.length || to < 0 || to >= items.length) return items;
	const next = [...items];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}

function plainText(value: string): string {
	return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * The text that names an item in the editor and the Changes diff: the first non-empty
 * text, textarea or rich editor child (in `locale`, falling back to the default locale).
 * Returns undefined when there is none, so callers can fall back to "{itemName} N".
 */
export function getRepeaterItemSummary(
	field: RepeaterFieldDefinition,
	item: RepeaterItem,
	locale: string,
	defaultLocale: string,
): string | undefined {
	for (const child of field.fields) {
		if (child.type !== "text" && child.type !== "textarea" && child.type !== "rich-editor") continue;
		const byLocale = item[child.name] as Partial<Record<string, unknown>> | undefined;
		const value = resolveFieldValue(child, byLocale, locale, defaultLocale);
		const text = typeof value === "string" ? plainText(value) : "";
		if (text) return text.length > 80 ? `${text.slice(0, 80)}…` : text;
	}
	return undefined;
}

export function repeaterItemLabel(field: RepeaterFieldDefinition, index: number): string {
	return t("repeater.itemLabel", { itemName: field.itemName ?? t("repeater.defaultItemName"), number: index + 1 });
}
