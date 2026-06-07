<script lang="ts">
	import type { Snippet } from "svelte";
	import { setContext } from "svelte";

	import { getGlobalsKnownKeys } from "$lib/globals/get-globals";

	import { GLOBAL_VARIABLES_CONTEXT_KEY } from "./context";
	import type { VariableItem } from "./types";

	type Props = {
		getPreview: (key: string) => string;
		getVariableItems: () => VariableItem[];
		children: Snippet;
	};

	let { getPreview, getVariableItems, children }: Props = $props();

	const knownKeys = getGlobalsKnownKeys();

	setContext(GLOBAL_VARIABLES_CONTEXT_KEY, {
		knownKeys,
		getPreview,
		getVariableItems
	});
</script>

{@render children()}
