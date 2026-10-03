<script lang="ts">
	import type { FieldAdornment } from "../../core/types";

	let { value }: { value: FieldAdornment } = $props();
</script>

{#if typeof value === "string"}
	{value}
{:else}
	{@const Icon = value}
	<Icon aria-hidden="true" />
{/if}
