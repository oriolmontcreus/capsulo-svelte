<script lang="ts">
	import { DEFAULT_LOCALE } from "../../config/i18n-config";
	import type { RepeaterFieldDefinition, RepeaterItem } from "../../form-builder/core/types";
	import { normalizeForComparison } from "./diff-model";
	import FieldValueView from "./FieldValueView.svelte";
	import { t } from "../../admin-i18n/i18n.svelte";

	/** Read-only list of an item's filled-in child values, with a tag on translations. */
	let { field, item }: { field: RepeaterFieldDefinition; item: RepeaterItem } = $props();

	const rows = $derived(
		field.fields.flatMap((child) => {
			const byLocale = item[child.name];
			if (typeof byLocale !== "object" || byLocale === null || Array.isArray(byLocale)) return [];
			return Object.entries(byLocale as Record<string, unknown>)
				.filter(([, value]) => normalizeForComparison(value) !== undefined)
				.map(([locale, value]) => ({ child, locale, value }));
		}),
	);
</script>

{#if rows.length > 0}
	<dl class="space-y-1.5">
		{#each rows as row (`${row.child.name}-${row.locale}`)}
			<div class="space-y-0.5">
				<dt class="text-muted-foreground flex items-center gap-1.5 text-[11px]">
					{row.child.label ?? row.child.name}
					{#if row.locale !== DEFAULT_LOCALE}
						<span class="bg-muted rounded px-1 text-[10px] uppercase">{row.locale}</span>
					{/if}
				</dt>
				<dd><FieldValueView field={row.child} value={row.value} /></dd>
			</div>
		{/each}
	</dl>
{:else}
	<span class="text-muted-foreground text-sm italic">{t("diff.empty")}</span>
{/if}
