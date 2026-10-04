<script lang="ts">
	import { Field, FieldDescription, FieldError, FieldLabel } from "../../../components/ui/field";
	import VariableTipTapSurface from "../../../globals/variable-autocomplete/variable-tiptap/VariableTipTapSurface.svelte";
	import FieldAdornment from "../shared/FieldAdornment.svelte";
	import type { TextareaFieldDefinition } from "./textarea-field.types";

	interface Props {
		field: TextareaFieldDefinition;
		value: string;
		onValueChange: (value: string) => void;
		error?: string;
	}

	let { field, value, onValueChange, error }: Props = $props();
</script>

{#snippet prefixAdornment()}
	{#if field.prefix}<FieldAdornment value={field.prefix} />{/if}
{/snippet}

{#snippet suffixAdornment()}
	{#if field.suffix}<FieldAdornment value={field.suffix} />{/if}
{/snippet}

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
		rows={field.minRows ?? field.rows ?? 3}
		maxRows={field.maxRows}
		autoresize={field.autoresize}
		resize={field.resize}
		maxLength={field.maxLength}
		prefix={field.prefix ? prefixAdornment : undefined}
		suffix={field.suffix ? suffixAdornment : undefined}
	/>

	{#if field.description}
		<FieldDescription>{field.description}</FieldDescription>
	{/if}

	{#if error}
		<FieldError>{error}</FieldError>
	{/if}
</Field>
