<script lang="ts">
	import type { HTMLTextareaAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	type Props = WithElementRef<HTMLTextareaAttributes & { autoresize?: boolean }>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		autoresize = false,
		rows = 3,
		"data-slot": dataSlot = "textarea",
		...restProps
	}: Props = $props();

	function handleInput(event: Event) {
		if (autoresize && ref) {
			ref.style.height = "auto";
			ref.style.height = ref.scrollHeight + "px";
		}
	}

	$effect(() => {
		if (autoresize && ref) {
			ref.style.height = "auto";
			ref.style.height = ref.scrollHeight + "px";
		}
	});
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		"border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:bg-input/30 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 flex min-h-[60px] w-full rounded-md border bg-white px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-3 aria-invalid:ring-3 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
		className
	)}
	bind:value
	{rows}
	oninput={handleInput}
	{...restProps}
></textarea>