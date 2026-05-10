<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import type { SchemaValues } from "../core/types";
	import { prototypeSchema } from "../schemas/prototype.schema";
	import SchemaRenderer from "../renderer/SchemaRenderer.svelte";
	import { schemaToZod } from "../core/schema-to-zod";
	import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
	import { resolveSchemaValues } from "../core/translation-runtime";

	let values = $state<SchemaValues>({});
	let validationMessage = $state("");
	let editingLocale = $state(DEFAULT_LOCALE);
	const resolvedValues = $derived(resolveSchemaValues(prototypeSchema, values, editingLocale, DEFAULT_LOCALE));

	function handleValidate() {
		const schema = schemaToZod(prototypeSchema);
		const result = schema.safeParse(values);

		validationMessage = result.success
			? "Schema validation passed."
			: result.error.issues[0]?.message ?? "Schema validation failed.";
	}
</script>

<div class="mx-auto max-w-2xl space-y-6">
	<div class="space-y-1">
		<h2 class="text-xl font-semibold">Schema prototype</h2>
		<p class="text-muted-foreground text-sm">Minimal schema renderer + zod validation demo.</p>
	</div>

	<SchemaRenderer
		schema={prototypeSchema}
		locales={LOCALES}
		defaultLocale={DEFAULT_LOCALE}
		editingLocale={editingLocale}
		onValuesChange={(nextValues) => {
			values = nextValues;
			validationMessage = "";
		}}
	/>

	<div class="flex flex-wrap items-center gap-2">
		<p class="text-muted-foreground text-sm">Editing locale:</p>
		{#each LOCALES as locale (locale)}
			<Button
				type="button"
				size="sm"
				variant={editingLocale === locale ? "default" : "secondary"}
				onclick={() => (editingLocale = locale)}
			>
				{locale}
				{#if locale === DEFAULT_LOCALE}
					&nbsp;(default)
				{/if}
			</Button>
		{/each}
	</div>

	<div class="flex items-center gap-3">
		<Button type="button" onclick={handleValidate}>Validate with zod</Button>
		{#if validationMessage}
			<p class="text-sm">{validationMessage}</p>
		{/if}
	</div>

	<div class="space-y-2">
		<p class="text-sm">
			<span class="font-medium">title:</span>
			{typeof resolvedValues.title === "string" ? resolvedValues.title : ""}
		</p>
		<pre class="bg-muted overflow-x-auto rounded-md p-3 text-xs">{JSON.stringify(values, null, 2)}</pre>
	</div>
</div>
