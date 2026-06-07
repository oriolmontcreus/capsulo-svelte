import type { Editor } from "@tiptap/core";
import type { EditorView } from "@tiptap/pm/view";

import { detectAutocompleteTrigger } from "./detect-autocomplete-trigger";
import { filterVariableItems } from "./filter-variable-items";
import { getCaretRect } from "./get-caret-rect";
import { insertVariableToken } from "./insert-variable-token";
import type { VariableItem } from "./types";

type VariableAutocompleteOptions = {
	getEditor: () => Editor | undefined;
	getItems: () => VariableItem[];
	singleLine: boolean;
};

export function createVariableAutocomplete(options: VariableAutocompleteOptions) {
	let open = $state(false);
	let searchQuery = $state("");
	let selectedIndex = $state(0);
	let anchorRect = $state<DOMRect | null>(null);
	let replaceFrom = $state(0);
	let replaceTo = $state(0);

	const filteredItems = $derived(filterVariableItems(options.getItems(), searchQuery));

	function close(): void {
		open = false;
		searchQuery = "";
		selectedIndex = 0;
		anchorRect = null;
	}

	function syncFromEditor(): void {
		const editor = options.getEditor();
		if (!editor) {
			close();
			return;
		}

		const trigger = detectAutocompleteTrigger(editor);
		if (!trigger) {
			close();
			return;
		}

		if (trigger.query !== searchQuery) {
			selectedIndex = 0;
		}

		searchQuery = trigger.query;
		replaceFrom = trigger.replaceFrom;
		replaceTo = trigger.replaceTo;
		anchorRect = getCaretRect(editor, trigger.replaceTo);
		open = true;
	}

	function selectItem(item: VariableItem): void {
		const editor = options.getEditor();
		if (!editor) return;

		insertVariableToken(editor, item.key, replaceFrom, replaceTo);
		close();
	}

	function handleKeyDown(_view: EditorView, event: KeyboardEvent): boolean {
		if (open) {
			if (event.key === "ArrowDown") {
				event.preventDefault();
				selectedIndex = Math.min(
					selectedIndex + 1,
					Math.max(filteredItems.length - 1, 0)
				);
				return true;
			}

			if (event.key === "ArrowUp") {
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				return true;
			}

			if (event.key === "Enter") {
				event.preventDefault();
				if (filteredItems.length > 0 && selectedIndex < filteredItems.length) {
					selectItem(filteredItems[selectedIndex]);
				}
				return true;
			}

			if (event.key === "Escape") {
				event.preventDefault();
				close();
				return true;
			}
		}

		if (options.singleLine && event.key === "Enter") {
			event.preventDefault();
			return true;
		}

		return false;
	}

	function handleOpenChange(nextOpen: boolean): void {
		if (!nextOpen) close();
	}

	return {
		get open() {
			return open;
		},
		get searchQuery() {
			return searchQuery;
		},
		get selectedIndex() {
			return selectedIndex;
		},
		get anchorRect() {
			return anchorRect;
		},
		get filteredItems() {
			return filteredItems;
		},
		syncFromEditor,
		handleKeyDown,
		selectItem,
		close,
		handleOpenChange
	};
}

export type VariableAutocompleteController = ReturnType<typeof createVariableAutocomplete>;
