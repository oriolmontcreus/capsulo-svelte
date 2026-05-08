<script lang="ts">
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Badge } from "$lib/components/ui/badge";

	import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";
	import Link from "@lucide/svelte/icons/link";
	import GripVertical from "@lucide/svelte/icons/grip-vertical";
	import FileText from "@lucide/svelte/icons/file-text";
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import Layers from "@lucide/svelte/icons/layers";

	type BindableField = { value: string };

	type Props = {
		internalName: BindableField;
		pageName: BindableField;
		slug: BindableField;
	};

	let { internalName = $bindable(), pageName = $bindable(), slug = $bindable() } = $props<Props>();
</script>

<aside
	class="border-border bg-background w-80 shrink-0 overflow-y-auto border-r"
	aria-label="Page settings"
>
	<div class="space-y-5 p-4">
		<!-- Internal name -->
		<div class="space-y-1.5">
			<Label for="internal-name" class="text-xs font-medium">Internal name</Label>
			<Input id="internal-name" bind:value={internalName.value} />
			<div class="text-muted-foreground flex justify-between text-[11px]">
				<span>{internalName.value.length} characters</span>
				<span>Maximum 256 characters</span>
			</div>
		</div>

		<!-- Page name -->
		<div class="space-y-1.5">
			<Label for="page-name" class="flex items-center gap-1.5 text-xs font-medium">
				<span>Page name</span>
				<span class="text-muted-foreground">|</span>
				<span class="text-muted-foreground font-normal"> English (United States) </span>
			</Label>
			<Input id="page-name" bind:value={pageName.value} />
			<div class="text-muted-foreground flex justify-between text-[11px]">
				<span>{pageName.value.length} characters</span>
				<span>Maximum 256 characters</span>
			</div>
		</div>

		<!-- Slug -->
		<div class="space-y-1.5">
			<Label for="slug" class="text-xs font-medium">
				Slug <span class="text-muted-foreground">(required)</span>
			</Label>
			<div class="relative">
				<Link
					class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
				/>
				<Input id="slug" bind:value={slug.value} class="pl-8" />
			</div>
		</div>

		<!-- SEO metadata -->
		<div>
			<div class="text-muted-foreground mb-2 text-xs font-medium">SEO metadata</div>
			<div
				class="border-border bg-background hover:bg-muted/30 group rounded-md border p-3 transition-colors"
			>
				<div class="mb-2 flex items-center gap-2">
					<div
						class="bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400 grid size-5 place-items-center rounded"
					>
						<FileText class="size-3" />
					</div>
					<span class="text-xs font-medium">SEO</span>
					<Badge
						class="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-transparent"
					>
						Published
					</Badge>
					<button
						type="button"
						aria-label="SEO options"
						class="text-muted-foreground hover:text-foreground"
					>
						<MoreHorizontal class="size-4" />
					</button>
				</div>
				<div class="flex items-start gap-3">
					<div class="min-w-0 flex-1">
						<div class="truncate text-sm font-medium">Modern Banking</div>
						<div class="text-muted-foreground truncate text-xs">Modern Banking</div>
					</div>
					<div
						class="aspect-video w-20 shrink-0 overflow-hidden rounded-sm bg-linear-to-br from-purple-300 via-pink-200 to-amber-200"
						aria-hidden="true"
					></div>
				</div>
			</div>
		</div>

		<!-- Top section (optional) -->
		<div>
			<div class="text-muted-foreground mb-2 text-xs font-medium">Top section (optional)</div>

			<div class="space-y-2">
				<!-- Hero (Marketing) outer card -->
				<div class="border-border bg-background rounded-md border">
					<div class="flex items-center gap-2 px-3 py-2">
						<GripVertical class="text-muted-foreground size-4 shrink-0 cursor-grab" />
						<Badge
							variant="secondary"
							class="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 gap-1 border-transparent"
						>
							<Sparkles class="size-3" />
							Hero (Marketing)
						</Badge>
						<Badge
							class="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-transparent"
						>
							Published
						</Badge>
						<button
							type="button"
							aria-label="Hero options"
							class="text-muted-foreground hover:text-foreground"
						>
							<MoreHorizontal class="size-4" />
						</button>
					</div>
					<!-- Hero inner block -->
					<div class="border-border bg-background mx-2 mb-2 flex items-start gap-3 rounded-md border p-3">
						<div class="min-w-0 flex-1">
							<div class="text-sm font-medium">Modern Banking Hero (Default)</div>
							<p class="text-muted-foreground mt-1 text-xs leading-snug">
								We wanted banking to be simple. So we redefined it.
							</p>
						</div>
						<div
							class="aspect-square w-12 shrink-0 overflow-hidden rounded-sm bg-linear-to-br from-purple-400 to-purple-200"
							aria-hidden="true"
						></div>
					</div>
				</div>

				<!-- Duplex outer card -->
				<div class="border-border bg-background rounded-md border">
					<div class="flex items-center gap-2 px-3 py-2">
						<GripVertical class="text-muted-foreground size-4 shrink-0 cursor-grab" />
						<Badge
							variant="secondary"
							class="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400 gap-1 border-transparent"
						>
							<Layers class="size-3" />
							Duplex
						</Badge>
						<Badge
							class="ml-auto bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border-transparent"
						>
							Published
						</Badge>
						<button
							type="button"
							aria-label="Duplex options"
							class="text-muted-foreground hover:text-foreground"
						>
							<MoreHorizontal class="size-4" />
						</button>
					</div>
					<div class="border-border bg-background mx-2 mb-2 flex items-start gap-3 rounded-md border p-3">
						<div class="min-w-0 flex-1">
							<div class="text-sm font-medium">Black card / Banking for travelers</div>
						</div>
						<div
							class="aspect-square w-12 shrink-0 overflow-hidden rounded-sm bg-linear-to-br from-zinc-700 to-zinc-400"
							aria-hidden="true"
						></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</aside>
