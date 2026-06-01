<script lang="ts">
	import { Select as SelectPrimitive } from "bits-ui";
	import { Field, FieldDescription, FieldError, FieldLabel } from "$lib/components/ui/field";
	import {
		Root as SelectRoot,
		Trigger as SelectTrigger,
		Content as SelectContent,
		Item as SelectItem,
		Group as SelectGroup,
		GroupHeading as SelectGroupHeading,
		Portal as SelectPortal,
	} from "$lib/components/ui/select";
	import { cn } from "$lib/utils";
	import SelectFieldGridStyles from "./SelectFieldGridStyles.svelte";
	import SelectFieldSearchable from "./select-field-searchable.svelte";
	import SelectOptionContent from "./SelectOptionContent.svelte";
	import type { SelectFieldDefinition, SelectOption } from "./select-field.types";
	import {
		createSelectGridId,
		getBaseGridStyle,
		getDropdownMinWidth,
		hasMultipleColumns,
	} from "./modules/responsive-styles";
	import { getAllOptions, resolveSelectData } from "./modules/resolve-options";
	import {
		formatSelectTriggerLabel,
		normalizeSelectValue,
	} from "./modules/select-value";

	interface Props {
		field: SelectFieldDefinition;
		value: string | string[];
		onValueChange: (value: string | string[]) => void;
		error?: string;
	}

	let { field, value, onValueChange, error }: Props = $props();

	let selectTriggerRef = $state<HTMLElement | null>(null);
	const labelId = $derived(`${field.name}-label`);

	const selectId = createSelectGridId();
	const resolvedData = $derived(resolveSelectData(field));
	const useGrid = $derived(hasMultipleColumns(field));
	const gridStyle = $derived(useGrid ? getBaseGridStyle(field) : undefined);
	const dropdownMinWidth = $derived(getDropdownMinWidth(field));
	const allOptions = $derived(getAllOptions(resolvedData));

	const normalizedValue = $derived(normalizeSelectValue(field, value));
	const singleValue = $derived(
		field.multiple ? "" : (normalizedValue as string),
	);
	const multipleValue = $derived(
		field.multiple ? (normalizedValue as string[]) : [],
	);
	const triggerLabel = $derived(
		field.multiple
			? formatSelectTriggerLabel(field, multipleValue, allOptions)
			: "",
	);
	const hasMultipleSelection = $derived(field.multiple && multipleValue.length > 0);

	const selectItems = $derived(
		allOptions.map((opt) => ({
			value: opt.value,
			label: opt.label,
			disabled: opt.disabled ?? false,
		})),
	);

	function handleSingleValueChange(newValue: string): void {
		onValueChange(newValue);
	}

	function handleMultipleValueChange(newValue: string[] | undefined): void {
		onValueChange(newValue ?? []);
	}

	function openSelectFromLabel(): void {
		selectTriggerRef?.click();
	}
</script>

{#snippet selectItem(option: SelectOption)}
	<SelectItem
		value={option.value}
		label={option.label}
		disabled={option.disabled}
		class={cn(option.description && "items-center py-2")}
	>
		<SelectOptionContent {option} />
	</SelectItem>
{/snippet}

{#snippet optionsList(options: SelectOption[])}
	{#if useGrid}
		<div data-select-id={selectId} class="select-grid-container" style={gridStyle}>
			{#each options as option (option.value)}
				{@render selectItem(option)}
			{/each}
		</div>
	{:else}
		{#each options as option (option.value)}
			{@render selectItem(option)}
		{/each}
	{/if}
{/snippet}

<Field data-invalid={error ? "true" : undefined}>
	<FieldLabel id={labelId} onclick={openSelectFromLabel}>
		{field.label ?? field.name}
		{#if field.required}
			<span class="text-destructive">*</span>
		{/if}
	</FieldLabel>

	{#if field.searchable}
		<SelectFieldSearchable {field} {value} {onValueChange} {error} />
	{:else if field.multiple}
		<SelectRoot
			type="multiple"
			items={selectItems}
			value={multipleValue}
			onValueChange={handleMultipleValueChange}
		>
			<SelectTrigger
				bind:ref={selectTriggerRef}
				id={field.name}
				aria-labelledby={labelId}
				class="w-full"
				aria-invalid={error ? true : undefined}
			>
				<span
					class={cn(
						"*:data-[slot=select-value]:line-clamp-1 truncate",
						!hasMultipleSelection && "text-muted-foreground",
					)}
				>
					{triggerLabel}
				</span>
			</SelectTrigger>

			<SelectPortal>
				<SelectContent
					class={useGrid ? "w-max max-w-[min(90vw,32rem)]" : undefined}
					style={dropdownMinWidth ? `min-width:${dropdownMinWidth}` : undefined}
				>
					<SelectFieldGridStyles {field} {selectId} />
					{#if resolvedData.hasGroups}
						{#each resolvedData.groups as group (group.label)}
							<SelectGroup>
								<SelectGroupHeading>{group.label}</SelectGroupHeading>
								{@render optionsList(group.options)}
							</SelectGroup>
						{/each}
					{:else}
						{@render optionsList(resolvedData.options)}
					{/if}
				</SelectContent>
			</SelectPortal>
		</SelectRoot>
	{:else}
		<SelectRoot
			type="single"
			items={selectItems}
			value={singleValue || undefined}
			onValueChange={handleSingleValueChange}
		>
			<SelectTrigger
				bind:ref={selectTriggerRef}
				id={field.name}
				aria-labelledby={labelId}
				class="w-full"
				aria-invalid={error ? true : undefined}
			>
				<SelectPrimitive.Value placeholder={field.placeholder ?? "Select an option"} />
			</SelectTrigger>

			<SelectPortal>
				<SelectContent
					class={useGrid ? "w-max max-w-[min(90vw,32rem)]" : undefined}
					style={dropdownMinWidth ? `min-width:${dropdownMinWidth}` : undefined}
				>
					<SelectFieldGridStyles {field} {selectId} />
					{#if resolvedData.hasGroups}
						{#each resolvedData.groups as group (group.label)}
							<SelectGroup>
								<SelectGroupHeading>{group.label}</SelectGroupHeading>
								{@render optionsList(group.options)}
							</SelectGroup>
						{/each}
					{:else}
						{@render optionsList(resolvedData.options)}
					{/if}
				</SelectContent>
			</SelectPortal>
		</SelectRoot>
	{/if}

	{#if field.description}
		<FieldDescription>{field.description}</FieldDescription>
	{/if}

	{#if error}
		<FieldError>{error}</FieldError>
	{/if}
</Field>
