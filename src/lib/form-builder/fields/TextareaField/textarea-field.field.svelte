<script lang="ts">
	import { Field, FieldDescription, FieldError, FieldLabel } from "$lib/components/ui/field";
	import { Textarea } from "$lib/components/ui/textarea";
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

	<Textarea
		id={field.name}
		name={field.name}
		value={value}
		placeholder={field.placeholder}
		required={field.required}
		rows={field.rows ?? 3}
		autoresize={field.autoresize}
		maxlength={field.maxLength}
		autocomplete="off"
		aria-invalid={error ? "true" : undefined}
		oninput={(event) => onValueChange((event.currentTarget as HTMLTextAreaElement).value)}
	/>

	{#if field.description}
		<FieldDescription>{field.description}</FieldDescription>
	{/if}

	{#if error}
		<FieldError>{error}</FieldError>
	{/if}
</Field>