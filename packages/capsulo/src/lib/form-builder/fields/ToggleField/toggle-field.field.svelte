<script lang="ts">
	import { Field, FieldDescription, FieldError, FieldLabel } from "$lib/components/ui/field";
	import { Switch } from "$lib/components/ui/switch";
	import type { ToggleFieldDefinition } from "./toggle-field.types";

	interface Props {
		field: ToggleFieldDefinition;
		value: boolean;
		onValueChange: (value: boolean) => void;
		error?: string;
	}

	let { field, value, onValueChange, error }: Props = $props();
</script>

<Field data-invalid={error ? "true" : undefined}>
	<div class="flex items-center gap-3">
		<Switch
			id={field.name}
			name={field.name}
			checked={value}
			aria-invalid={error ? "true" : undefined}
			onCheckedChange={(checked: boolean) => onValueChange(checked)}
		/>

		<FieldLabel for={field.name} class="cursor-pointer">
			{field.label ?? field.name}
			{#if field.required}
				<span class="text-destructive">*</span>
			{/if}
		</FieldLabel>
	</div>

	{#if field.description}
		<FieldDescription>{field.description}</FieldDescription>
	{/if}

	{#if error}
		<FieldError>{error}</FieldError>
	{/if}
</Field>
