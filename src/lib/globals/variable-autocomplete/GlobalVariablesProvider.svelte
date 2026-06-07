<script lang="ts">
	import type { Snippet } from "svelte";
	import { setContext } from "svelte";

	import { getGlobalsKnownKeys } from "$lib/globals/get-globals";

	import { GLOBAL_VARIABLES_CONTEXT_KEY } from "./context";

	type Props = {
		getPreview: (key: string) => string;
		children: Snippet;
	};

	let { getPreview, children }: Props = $props();

	const knownKeys = getGlobalsKnownKeys();

	setContext(GLOBAL_VARIABLES_CONTEXT_KEY, {
		knownKeys,
		getPreview
	});
</script>

{@render children()}
