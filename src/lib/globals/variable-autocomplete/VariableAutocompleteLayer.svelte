<script lang="ts">
	import type { Editor } from "@tiptap/core";
	import type { EditorView } from "@tiptap/pm/view";
	import type { Snippet } from "svelte";
	import { getContext } from "svelte";

	import GlobalVariableSelect from "./GlobalVariableSelect.svelte";
	import { GLOBAL_VARIABLES_CONTEXT_KEY, type GlobalVariablesContext } from "./context";
	import { createVariableAutocomplete } from "./variable-autocomplete.svelte";

	export type AutocompleteHandlers = {
		handleKeyDown: (view: EditorView, event: KeyboardEvent) => boolean;
	};

	type Props = {
		getEditor: () => Editor | undefined;
		singleLine: boolean;
		onHandlersChange?: (handlers: AutocompleteHandlers | null) => void;
		children: Snippet;
	};

	let { getEditor, singleLine, onHandlersChange, children }: Props = $props();

	const globalsContext = getContext<GlobalVariablesContext | undefined>(
		GLOBAL_VARIABLES_CONTEXT_KEY
	);

	const autocomplete = globalsContext?.getVariableItems
		? createVariableAutocomplete({
				getEditor,
				getItems: globalsContext.getVariableItems,
				singleLine
			})
		: null;

	$effect(() => {
		onHandlersChange?.(
			autocomplete ? { handleKeyDown: autocomplete.handleKeyDown } : null
		);
	});

	$effect(() => {
		if (!autocomplete) return;

		const editor = getEditor();
		if (!editor) return;

		const onTransaction = () => autocomplete.syncFromEditor();
		editor.on("transaction", onTransaction);
		return () => {
			editor.off("transaction", onTransaction);
		};
	});
</script>

{#if autocomplete}
	<GlobalVariableSelect
		open={autocomplete.open}
		onOpenChange={autocomplete.handleOpenChange}
		onSelect={autocomplete.selectItem}
		searchQuery={autocomplete.searchQuery}
		selectedIndex={autocomplete.selectedIndex}
		items={autocomplete.filteredItems}
		anchorRect={autocomplete.anchorRect}
	>
		{@render children()}
	</GlobalVariableSelect>
{:else}
	{@render children()}
{/if}
