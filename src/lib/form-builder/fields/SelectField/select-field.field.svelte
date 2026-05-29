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
	import SelectFieldGridStyles from "./SelectFieldGridStyles.svelte";
	import SelectFieldSearchable from "./select-field-searchable.svelte";
	import type { SelectFieldDefinition, SelectOption } from "./select-field.types";
	import {
		createSelectGridId,
		getBaseGridStyle,
		getDropdownMinWidth,
		hasMultipleColumns,
	} from "./modules/responsive-styles";
	import { getAllOptions, resolveSelectData } from "./modules/resolve-options";

	interface Props {
		field: SelectFieldDefinition;
		value: string;
		onValueChange: (value: string) => void;
		error?: string;
	}

	let { field, value, onValueChange, error }: Props = $props();

	const selectId = createSelectGridId();
	const resolvedData = $derived(resolveSelectData(field));
	const useGrid = $derived(hasMultipleColumns(field));
	const gridStyle = $derived(useGrid ? getBaseGridStyle(field) : undefined);
	const dropdownMinWidth = $derived(getDropdownMinWidth(field));

	const selectItems = $derived(
		getAllOptions(resolvedData).map((opt) => ({
			value: opt.value,
			label: opt.label,
			disabled: opt.disabled ?? false,
		})),
	);

	function handleValueChange(newValue: string): void {
		onValueChange(newValue);
	}
</script>

{#snippet selectOptionContent(option: SelectOption)}
	{option.label}
	{#if option.description}
		<span class="text-muted-foreground ml-1 text-xs">- {option.description}</span>
	{/if}
{/snippet}

{#snippet flatSelectItems(options: SelectOption[])}
	{#if useGrid}
		<SelectFieldGridStyles {field} {selectId} />
		<div data-select-id={selectId} class="select-grid-container" style={gridStyle}>
			{#each options as option (option.value)}
				<SelectItem
					value={option.value}
					label={option.label}
					disabled={option.disabled}
				>
					{@render selectOptionContent(option)}
				</SelectItem>
			{/each}
		</div>
	{:else}
		{#each options as option (option.value)}
			<SelectItem value={option.value} label={option.label} disabled={option.disabled}>
				{@render selectOptionContent(option)}
			</SelectItem>
		{/each}
	{/if}
{/snippet}

{#snippet groupedSelectItems()}
	{#each resolvedData.groups as group (group.label)}
		<SelectGroup>
			<SelectGroupHeading>{group.label}</SelectGroupHeading>
			{#if useGrid}
				<SelectFieldGridStyles {field} {selectId} />
				<div data-select-id={selectId} class="select-grid-container" style={gridStyle}>
					{#each group.options as option (option.value)}
						<SelectItem
							value={option.value}
							label={option.label}
							disabled={option.disabled}
						>
							{@render selectOptionContent(option)}
						</SelectItem>
					{/each}
				</div>
			{:else}
				{#each group.options as option (option.value)}
					<SelectItem
						value={option.value}
						label={option.label}
						disabled={option.disabled}
					>
						{@render selectOptionContent(option)}
					</SelectItem>
				{/each}
			{/if}
		</SelectGroup>
	{/each}
{/snippet}

<Field data-invalid={error ? "true" : undefined}>
	<FieldLabel for={field.name}>
		{field.label ?? field.name}
		{#if field.required}
			<span class="text-destructive">*</span>
		{/if}
	</FieldLabel>

	{#if field.searchable}
		<SelectFieldSearchable {field} {value} {onValueChange} {error} />
	{:else}
		<SelectRoot
			type="single"
			items={selectItems}
			value={value || undefined}
			onValueChange={handleValueChange}
		>
			<SelectTrigger id={field.name} class="w-full" aria-invalid={error ? true : undefined}>
				<SelectPrimitive.Value placeholder={field.placeholder ?? "Select an option"} />
			</SelectTrigger>

			<SelectPortal>
				<SelectContent
					class={useGrid ? "w-max max-w-[min(90vw,32rem)]" : undefined}
					style={dropdownMinWidth ? `min-width:${dropdownMinWidth}` : undefined}
				>
					{#if resolvedData.hasGroups}
						{@render groupedSelectItems()}
					{:else}
						{@render flatSelectItems(resolvedData.options)}
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
