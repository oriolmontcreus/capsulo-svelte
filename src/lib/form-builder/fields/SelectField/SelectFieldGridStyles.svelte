<script lang="ts">
	import type { SelectFieldDefinition } from "./select-field.types";
	import {
		generateResponsiveStyles,
		shouldInjectResponsiveStyles,
	} from "./modules/responsive-styles";

	interface Props {
		field: SelectFieldDefinition;
		selectId: string;
	}

	let { field, selectId }: Props = $props();

	const responsiveCss = $derived(
		shouldInjectResponsiveStyles(field) && typeof field.columns === "object"
			? generateResponsiveStyles(selectId, field.columns)
			: "",
	);
</script>

{#if responsiveCss}
	{@html `<style>${responsiveCss}</style>`}
{/if}
