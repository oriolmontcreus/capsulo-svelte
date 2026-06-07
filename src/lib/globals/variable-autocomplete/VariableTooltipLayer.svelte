<script lang="ts">
	import type { Snippet } from "svelte";
	import { getContext } from "svelte";

	import * as Tooltip from "$lib/components/ui/tooltip";

	import { GLOBAL_VARIABLES_CONTEXT_KEY, type GlobalVariablesContext } from "./context";

	type Props = {
		children: Snippet;
	};

	let { children }: Props = $props();

	const globalsContext = getContext<GlobalVariablesContext | undefined>(
		GLOBAL_VARIABLES_CONTEXT_KEY
	);

	let containerEl = $state<HTMLDivElement | undefined>();
	let virtualAnchorEl = $state<HTMLSpanElement | undefined>();
	let hoveredKey = $state<string | null>(null);
	let anchorRect = $state<DOMRect | null>(null);

	const previewText = $derived.by(() => {
		if (!hoveredKey || !globalsContext) return "";
		return globalsContext.getPreview(hoveredKey);
	});

	const tooltipOpen = $derived(Boolean(hoveredKey && globalsContext && anchorRect));

	$effect(() => {
		if (!virtualAnchorEl || !anchorRect) return;

		virtualAnchorEl.style.position = "fixed";
		virtualAnchorEl.style.top = `${anchorRect.bottom}px`;
		virtualAnchorEl.style.left = `${anchorRect.left}px`;
		virtualAnchorEl.style.width = `${anchorRect.width}px`;
		virtualAnchorEl.style.height = "1px";
		virtualAnchorEl.style.pointerEvents = "none";
	});

	function resolveVariableTarget(target: EventTarget | null): HTMLElement | null {
		if (!(target instanceof HTMLElement) || !containerEl) return null;
		const variableEl = target.closest<HTMLElement>("[data-global-variable]");
		if (!variableEl || !containerEl.contains(variableEl)) return null;
		return variableEl;
	}

	function handlePointerOver(event: PointerEvent): void {
		const variableEl = resolveVariableTarget(event.target);
		if (!variableEl) return;

		const nextKey = variableEl.dataset.globalVariable?.trim();
		if (!nextKey) return;

		hoveredKey = nextKey;
		anchorRect = variableEl.getBoundingClientRect();
	}

	function handlePointerOut(event: PointerEvent): void {
		const leavingEl = resolveVariableTarget(event.target);
		if (!leavingEl) return;

		const enteringEl = resolveVariableTarget(event.relatedTarget);
		if (enteringEl?.dataset.globalVariable === leavingEl.dataset.globalVariable) return;

		hoveredKey = null;
		anchorRect = null;
	}
</script>

<div
	bind:this={containerEl}
	class="relative w-full"
	role="group"
	onpointerover={handlePointerOver}
	onpointerout={handlePointerOut}
>
	{@render children()}

	{#if globalsContext}
		<span bind:this={virtualAnchorEl} aria-hidden="true" class="pointer-events-none"></span>

		<Tooltip.Root open={tooltipOpen}>
			<Tooltip.Trigger class="sr-only" tabindex={-1} aria-hidden="true"></Tooltip.Trigger>
			<Tooltip.Content
				customAnchor={anchorRect ? virtualAnchorEl : undefined}
				side="bottom"
				align="center"
				sideOffset={6}
				onpointerdown={(event) => event.preventDefault()}
			>
				{#if previewText === "Empty"}
					<span class="text-muted-foreground italic">Empty</span>
				{:else if previewText === "Unknown variable"}
					<span class="text-destructive">{previewText}</span>
				{:else}
					{previewText}
				{/if}
			</Tooltip.Content>
		</Tooltip.Root>
	{/if}
</div>
