<script lang="ts">
	import { ScrollArea as ScrollAreaPrimitive } from "bits-ui";
	import { cn, type WithoutChildrenOrChild } from "$lib/utils.js";
	import type { Snippet } from "svelte";

	let {
		ref = $bindable(null),
		class: className,
		orientation = "vertical",
		scrollbarXClasses = "",
		scrollbarYClasses = "",
		children,
		...restProps
	}: WithoutChildrenOrChild<ScrollAreaPrimitive.RootProps> & {
		orientation?: "vertical" | "horizontal" | "both";
		scrollbarXClasses?: string;
		scrollbarYClasses?: string;
		children: Snippet;
	} = $props();
</script>

<ScrollAreaPrimitive.Root
	bind:ref
	class={cn("relative overflow-hidden", className)}
	{...restProps}
>
	<ScrollAreaPrimitive.Viewport class="h-full w-full rounded-[inherit]">
		{@render children?.()}
	</ScrollAreaPrimitive.Viewport>
	{#if orientation === "vertical" || orientation === "both"}
		<ScrollAreaPrimitive.Scrollbar
			orientation="vertical"
			class={cn(
				"flex w-2.5 touch-none select-none p-px transition-colors",
				scrollbarYClasses
			)}
		>
			<ScrollAreaPrimitive.Thumb class="bg-border relative flex-1 rounded-full" />
		</ScrollAreaPrimitive.Scrollbar>
	{/if}
	{#if orientation === "horizontal" || orientation === "both"}
		<ScrollAreaPrimitive.Scrollbar
			orientation="horizontal"
			class={cn(
				"flex h-2.5 touch-none select-none flex-col p-px transition-colors",
				scrollbarXClasses
			)}
		>
			<ScrollAreaPrimitive.Thumb class="bg-border relative flex-1 rounded-full" />
		</ScrollAreaPrimitive.Scrollbar>
	{/if}
	<ScrollAreaPrimitive.Corner />
</ScrollAreaPrimitive.Root>
