<script lang="ts">
	import type { WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/utils.js";
	import { t } from "$lib/admin-i18n/i18n.svelte";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLElement>> = $props();
</script>

<nav
	bind:this={ref}
	data-slot="breadcrumb"
	aria-label={t("ui.breadcrumb")}
	class={cn("cn-breadcrumb", className)}
	{...restProps}
>
	{@render children?.()}
</nav>
