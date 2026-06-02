<script lang="ts">
	import ColorPicker from "svelte-awesome-color-picker";
	import { Field, FieldDescription, FieldError, FieldLabel } from "$lib/components/ui/field";
	import { Popover, PopoverContent, PopoverTrigger } from "$lib/components/ui/popover";
	import type { ColorPickerFieldDefinition } from "./color-picker-field.types";

	interface Props {
		field: ColorPickerFieldDefinition;
		value: string;
		onValueChange: (value: string) => void;
		error?: string;
	}

	let { field, value, onValueChange, error }: Props = $props();

	let open = $state(false);
	let localHex = $state(value || "#000000");

	$effect(() => {
		localHex = value || "#000000";
	});

	function onInput(colorInfo: { hsv: unknown; rgb: unknown; hex: string | null; color: unknown }): void {
		if (colorInfo.hex != null) {
			const normalized = colorInfo.hex.toLowerCase();
			localHex = normalized;
			onValueChange(normalized);
		}
	}

	const DEFAULT_SWATCHES = [
		"#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff",
		"#ffff00", "#ff00ff", "#00ffff", "#ff8800", "#8800ff",
		"#008800", "#880000", "#888888", "#444444", "#cccccc",
	];

	const swatches = $derived(field.presetColors && field.presetColors.length > 0 ? field.presetColors : DEFAULT_SWATCHES);
</script>

<Field data-invalid={error ? "true" : undefined}>
	<FieldLabel for={field.name}>
		{field.label ?? field.name}
		{#if field.required}
			<span class="text-destructive">*</span>
		{/if}
	</FieldLabel>

	<Popover bind:open>
		<PopoverTrigger>
			<button
				type="button"
				class="flex h-10 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			>
				<span
					class="size-6 shrink-0 rounded-md border border-border"
					style="background-color: {localHex};"
				></span>
				<span class="font-mono truncate">{localHex}</span>
			</button>
		</PopoverTrigger>
		<PopoverContent side="right" align="start" class="w-auto p-0">
			{#if field.onlyPresets}
				<div class="grid grid-cols-5 gap-2 p-3">
					{#each swatches as color}
						<button
							type="button"
							class="size-8 rounded-md border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
							style="background-color: {color};"
							title={color}
							onclick={() => {
								localHex = color.toLowerCase();
								onValueChange(color.toLowerCase());
								open = false;
							}}
						></button>
					{/each}
				</div>
			{:else}
				<div class="color-picker-wrapper">
					<ColorPicker
						bind:hex={localHex}
						{onInput}
						{swatches}
						isAlpha={field.showAlpha ?? false}
						isDialog={false}
					/>

					{#if field.presetColors && field.presetColors.length > 0}
						<div class="grid grid-cols-5 gap-2 pt-2 border-t border-border mt-2">
							{#each field.presetColors as presetColor}
								<button
									type="button"
									class="size-7 rounded-md border border-border transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring"
									style="background-color: {presetColor};"
									title={presetColor}
									onclick={() => {
										localHex = presetColor.toLowerCase();
										onValueChange(presetColor.toLowerCase());
									}}
								></button>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		</PopoverContent>
	</Popover>

	{#if field.description}
		<FieldDescription>{field.description}</FieldDescription>
	{/if}

	{#if error}
		<FieldError>{error}</FieldError>
	{/if}
</Field>

<style>
	.color-picker-wrapper {
		padding: 12px;
		--picker-width: 240px;
		--picker-height: 240px;
		--slider-width: 20px;
	}

	.color-picker-wrapper :global(.wrapper) {
		margin: 0;
		padding: 0;
		border: none;
		background: transparent;
		border-radius: 0;
	}

	.color-picker-wrapper :global(.wrapper.is-open) {
		display: inline-block;
		width: auto;
	}

	.color-picker-wrapper :global(.picker) {
		border-radius: 8px;
	}

	.color-picker-wrapper :global(.swatches) {
		--cp-swatch-grid-template-columns: repeat(auto-fit, minmax(28px, 1fr));
		gap: 6px;
		margin-top: 8px;
	}

	.color-picker-wrapper :global(.swatch) {
		border-radius: 6px;
	}
</style>