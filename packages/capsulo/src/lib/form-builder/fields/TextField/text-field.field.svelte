<script lang="ts">
	import { Field, FieldDescription, FieldError, FieldLabel } from "$lib/components/ui/field";
	import * as InputGroup from "$lib/components/ui/input-group";
	import VariableTipTapSurface from "$lib/globals/variable-autocomplete/variable-tiptap/VariableTipTapSurface.svelte";
	import FieldAdornment from "../shared/FieldAdornment.svelte";
	import type { TextFieldDefinition } from "./text-field.types";

	interface Props {
		field: TextFieldDefinition;
		value: string | number | null;
		onValueChange: (value: string | number | null) => void;
		error?: string;
	}

	let { field, value, onValueChange, error }: Props = $props();

	const inputType = $derived(field.inputType ?? "text");
	/** Number and password inputs are plain inputs; the others offer `{{variables}}`. */
	const usesPlainInput = $derived(inputType === "number" || inputType === "password");
	const numberStep = $derived(field.step ?? (field.allowDecimals === false ? 1 : "any"));

	let inputEl = $state<HTMLInputElement | null>(null);

	function formatNumber(current: unknown): string {
		return typeof current === "number" && Number.isFinite(current) ? String(current) : "";
	}

	// While typing, the browser holds partial numbers like "-" or "1." that have no value yet;
	// only rewrite the input when the stored number really differs from what it shows.
	$effect(() => {
		if (!inputEl || inputType !== "number") return;
		const shown = inputEl.value === "" ? null : inputEl.valueAsNumber;
		const stored = typeof value === "number" ? value : null;
		if (shown !== stored && !(Number.isNaN(shown) && document.activeElement === inputEl)) {
			inputEl.value = formatNumber(value);
		}
	});

	function handleNumberInput(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		if (input.value === "") {
			// An invalid partial entry also reads as "": keep the stored value until it's a number.
			if (!input.validity.badInput) onValueChange(null);
			return;
		}
		const next = input.valueAsNumber;
		if (Number.isFinite(next)) onValueChange(next);
	}
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

	{#if usesPlainInput}
		<InputGroup.Root>
			{#if field.prefix}
				<InputGroup.Addon><FieldAdornment value={field.prefix} /></InputGroup.Addon>
			{/if}
			{#if inputType === "number"}
				<InputGroup.Input
					bind:ref={inputEl}
					id={field.name}
					type="number"
					inputmode={field.allowDecimals === false ? "numeric" : "decimal"}
					min={field.min}
					max={field.max}
					step={numberStep}
					placeholder={field.placeholder}
					aria-invalid={error ? "true" : undefined}
					oninput={handleNumberInput}
				/>
			{:else}
				<InputGroup.Input
					id={field.name}
					type="password"
					autocomplete="off"
					value={typeof value === "string" ? value : ""}
					maxlength={field.maxLength}
					placeholder={field.placeholder}
					aria-invalid={error ? "true" : undefined}
					oninput={(event) => onValueChange(event.currentTarget.value)}
				/>
			{/if}
			{#if field.suffix}
				<InputGroup.Addon align="inline-end"><FieldAdornment value={field.suffix} /></InputGroup.Addon>
			{/if}
		</InputGroup.Root>
	{:else}
		<VariableTipTapSurface
			id={field.name}
			mode="singleline"
			value={typeof value === "string" ? value : ""}
			onValueChange={(next) => onValueChange(next)}
			placeholder={field.placeholder}
			invalid={!!error}
			maxLength={field.maxLength}
			prefix={field.prefix ? prefixAdornment : undefined}
			suffix={field.suffix ? suffixAdornment : undefined}
		/>
	{/if}

	{#if field.description}
		<FieldDescription>{field.description}</FieldDescription>
	{/if}

	{#if error}
		<FieldError>{error}</FieldError>
	{/if}
</Field>
