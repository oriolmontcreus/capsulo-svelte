<script lang="ts">
	import Image from "@lucide/svelte/icons/image";

	type Props = {
		previewWidth: string;
	};

	let { previewWidth } = $props<Props>();
</script>

<main
	class="bg-muted/40 flex min-w-0 flex-1 items-start justify-center overflow-auto p-6"
	aria-label="Preview"
>
	<div
		class="bg-background border-border w-full overflow-hidden rounded-md border shadow-sm transition-[width] duration-200"
		style:width={previewWidth}
		style:max-width="100%"
		style:min-height="100%"
	>
		<!-- Mock site header -->
		<div class="border-border flex items-center justify-between border-b px-6 py-4">
			<div class="flex items-center gap-2">
				<div class="bg-muted size-6 rounded-full" aria-hidden="true"></div>
				<div class="bg-muted h-3 w-16 rounded" aria-hidden="true"></div>
			</div>
			<div class="hidden items-center gap-3 sm:flex">
				<div class="bg-muted h-2 w-10 rounded" aria-hidden="true"></div>
				<div class="bg-muted h-2 w-10 rounded" aria-hidden="true"></div>
				<div class="bg-muted h-2 w-10 rounded" aria-hidden="true"></div>
				<div class="bg-muted h-6 w-6 rounded" aria-hidden="true"></div>
			</div>
		</div>

		<!-- Mock hero -->
		<div class="px-6 pt-8 pb-12">
			<div
				class="bg-muted/70 text-muted-foreground relative grid aspect-video w-full place-items-center overflow-hidden rounded-md"
			>
				<div class="flex flex-col items-center gap-2">
					<Image class="size-8 opacity-60" />
					<span class="text-sm">Preview</span>
				</div>
			</div>

			<!-- Mock content rows -->
			<div class="mt-8 space-y-3">
				<div class="bg-muted h-3 w-3/5 rounded" aria-hidden="true"></div>
				<div class="bg-muted h-3 w-4/5 rounded" aria-hidden="true"></div>
				<div class="bg-muted h-3 w-2/5 rounded" aria-hidden="true"></div>
			</div>

			<div class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
				{#each [1, 2, 3] as i (i)}
					<div class="space-y-2">
						<div class="bg-muted/70 aspect-video w-full rounded-md" aria-hidden="true"></div>
						<div class="bg-muted h-2.5 w-3/4 rounded" aria-hidden="true"></div>
						<div class="bg-muted h-2 w-1/2 rounded" aria-hidden="true"></div>
					</div>
				{/each}
			</div>
		</div>
	</div>
</main>
