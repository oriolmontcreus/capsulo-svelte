<script lang="ts">
	import type { Snippet } from "svelte";
	import { setContext } from "svelte";

	import { GLOBAL_VARIABLES_CONTEXT_KEY } from "./context";

	type Props = {
		locale: string;
		knownKeys: ReadonlySet<string>;
		getPreview: (key: string) => string;
		children: Snippet;
	};

	let { locale, knownKeys, getPreview, children }: Props = $props();

	setContext(GLOBAL_VARIABLES_CONTEXT_KEY, {
		get locale() {
			return locale;
		},
		get knownKeys() {
			return knownKeys;
		},
		getPreview
	});
</script>

{@render children()}
