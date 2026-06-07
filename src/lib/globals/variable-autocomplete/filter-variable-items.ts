import type { VariableItem } from "./types";

export function filterVariableItems(
	items: VariableItem[],
	searchQuery: string
): VariableItem[] {
	if (!searchQuery) return items;

	const lowerQuery = searchQuery.toLowerCase();
	return items.filter((item) => item.key.toLowerCase().includes(lowerQuery));
}
