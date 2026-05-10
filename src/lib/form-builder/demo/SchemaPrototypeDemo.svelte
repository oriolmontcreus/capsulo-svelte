<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import type { SchemaValues } from "../core/types";
	import { prototypeSchema } from "../schemas/prototype.schema";
	import SchemaRenderer from "../renderer/SchemaRenderer.svelte";
	import { schemaToZod } from "../core/schema-to-zod";

	let values = $state<SchemaValues>({});
	let validationMessage = $state("");

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
		onValuesChange={(nextValues) => {
			values = nextValues;
			validationMessage = "";
		}}
	/>

	<div class="flex items-center gap-3">
		<Button type="button" onclick={handleValidate}>Validate with zod</Button>
		{#if validationMessage}
			<p class="text-sm">{validationMessage}</p>
		{/if}
	</div>

	<div class="space-y-2">
		<p class="text-sm"><span class="font-medium">title:</span> {values.title ?? ""}</p>
		<pre class="bg-muted overflow-x-auto rounded-md p-3 text-xs">{JSON.stringify(values, null, 2)}</pre>
	</div>
</div>
