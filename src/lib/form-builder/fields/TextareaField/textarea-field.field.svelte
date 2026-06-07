<script lang="ts">
	import { Field, FieldDescription, FieldError, FieldLabel } from "$lib/components/ui/field";
	import VariableTipTapSurface from "$lib/globals/variable-autocomplete/variable-tiptap/VariableTipTapSurface.svelte";
	import type { TextareaFieldDefinition } from "./textarea-field.types";

	interface Props {
		field: TextareaFieldDefinition;
		value: string;
		onValueChange: (value: string) => void;
		error?: string;
	}

	let { field, value, onValueChange, error }: Props = $props();
</script>

<Field data-invalid={error ? "true" : undefined}>
	<FieldLabel for={field.name}>
		{field.label ?? field.name}
		{#if field.required}
			<span class="text-destructive">*</span>
		{/if}
	</FieldLabel>

	<VariableTipTapSurface
		id={field.name}
		mode="multiline"
		{value}
		{onValueChange}
		placeholder={field.placeholder}
		invalid={!!error}
		rows={field.rows ?? 3}
		autoresize={field.autoresize}
		maxLength={field.maxLength}
	/>

	{#if field.description}
		<FieldDescription>{field.description}</FieldDescription>
	{/if}

	{#if error}
		<FieldError>{error}</FieldError>
	{/if}
</Field>
