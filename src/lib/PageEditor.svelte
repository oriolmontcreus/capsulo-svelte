<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { Badge } from "$lib/components/ui/badge";
	import * as Tabs from "$lib/components/ui/tabs";
	import * as Select from "$lib/components/ui/select";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
	import * as Tooltip from "$lib/components/ui/tooltip";

	import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";
	import Monitor from "@lucide/svelte/icons/monitor";
	import Smartphone from "@lucide/svelte/icons/smartphone";
	import Tablet from "@lucide/svelte/icons/tablet";
	import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
	import Copy from "@lucide/svelte/icons/copy";
	import ExternalLink from "@lucide/svelte/icons/external-link";
	import Maximize2 from "@lucide/svelte/icons/maximize-2";
	import X from "@lucide/svelte/icons/x";
	import Link from "@lucide/svelte/icons/link";
	import GripVertical from "@lucide/svelte/icons/grip-vertical";
	import Image from "@lucide/svelte/icons/image";
	import FileText from "@lucide/svelte/icons/file-text";
	import Sparkles from "@lucide/svelte/icons/sparkles";
	import Layers from "@lucide/svelte/icons/layers";

	type Viewport = "desktop" | "tablet" | "mobile";

	let viewport = $state<Viewport>("desktop");
	let locale = $state<string>("en-US");

	const viewportWidths: Record<Viewport, string> = {
		desktop: "100%",
		tablet: "820px",
		mobile: "390px"
	};

	const previewWidth = $derived(viewportWidths[viewport]);

	const internalName = $state({ value: "Homepage" });
	const pageName = $state({ value: "The card you always wanted" });
	const slug = $state({ value: "home" });
</script>

<Tooltip.Provider delayDuration={150}>
	<div class="bg-background text-foreground flex h-dvh w-full flex-col overflow-hidden">
		<!-- Topbar -->
		<header
			class="border-border flex h-14 shrink-0 items-center justify-between gap-3 border-b px-3"
		>
			<!-- Left cluster -->
			<div class="flex min-w-0 items-center gap-2">
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								aria-label="Page options"
							>
								<MoreHorizontal />
							</Button>
						{/snippet}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content align="start" class="w-44">
						<DropdownMenu.Item>Duplicate</DropdownMenu.Item>
						<DropdownMenu.Item>Rename</DropdownMenu.Item>
						<DropdownMenu.Item>Move to folder</DropdownMenu.Item>
						<DropdownMenu.Separator />
						<DropdownMenu.Item class="text-destructive">Delete</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<span class="text-sm font-medium">Homepage</span>

				<Button
					size="sm"
					class="ml-1 h-7 bg-emerald-500 px-3 text-white hover:bg-emerald-600"
				>
					Publish
				</Button>
			</div>

			<!-- Center cluster -->
			<div class="flex items-center gap-1">
				<Tabs.Root
					bind:value={() => viewport, (v) => (viewport = v as Viewport)}
					class="contents"
				>
					<Tabs.List class="h-8">
						<Tabs.Trigger value="desktop" aria-label="Desktop preview" class="px-2.5">
							<Monitor />
						</Tabs.Trigger>
						<Tabs.Trigger value="mobile" aria-label="Mobile preview" class="px-2.5">
							<Smartphone />
						</Tabs.Trigger>
						<Tabs.Trigger value="tablet" aria-label="Tablet preview" class="px-2.5">
							<Tablet />
						</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								aria-label="Reset preview"
							>
								<RotateCcw />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>Reset preview</Tooltip.Content>
				</Tooltip.Root>
			</div>

			<!-- Right cluster -->
			<div class="flex items-center gap-1">
				<Select.Root type="single" bind:value={locale}>
					<Select.Trigger size="sm" class="h-8 min-w-48 gap-1 text-xs">
						{locale === "en-US"
							? "English (United States)"
							: locale === "es-ES"
								? "Spanish (Spain)"
								: "French (France)"}
					</Select.Trigger>
					<Select.Content align="end">
						<Select.Item value="en-US">English (United States)</Select.Item>
						<Select.Item value="es-ES">Spanish (Spain)</Select.Item>
						<Select.Item value="fr-FR">French (France)</Select.Item>
					</Select.Content>
				</Select.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button {...props} variant="ghost" size="icon-sm" aria-label="Copy URL">
								<Copy />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>Copy URL</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								aria-label="Open in new tab"
							>
								<ExternalLink />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>Open in new tab</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								aria-label="Fullscreen preview"
							>
								<Maximize2 />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>Fullscreen preview</Tooltip.Content>
				</Tooltip.Root>

				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant="ghost"
								size="icon-sm"
								aria-label="Close editor"
							>
								<X />
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>Close editor</Tooltip.Content>
				</Tooltip.Root>
			</div>
		</header>

		<!-- Body -->
		<div class="flex min-h-0 flex-1">
			<!-- Sidebar -->
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
							<span class="text-muted-foreground font-normal">
								English (United States)
							</span>
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
									<div class="text-muted-foreground truncate text-xs">
										Modern Banking
									</div>
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
						<div class="text-muted-foreground mb-2 text-xs font-medium">
							Top section (optional)
						</div>

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
								<div
									class="border-border bg-background mx-2 mb-2 flex items-start gap-3 rounded-md border p-3"
								>
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
								<div
									class="border-border bg-background mx-2 mb-2 flex items-start gap-3 rounded-md border p-3"
								>
									<div class="min-w-0 flex-1">
										<div class="text-sm font-medium">
											Black card / Banking for travelers
										</div>
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

			<!-- Preview pane -->
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
					<div
						class="border-border flex items-center justify-between border-b px-6 py-4"
					>
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
									<div
										class="bg-muted/70 aspect-video w-full rounded-md"
										aria-hidden="true"
									></div>
									<div class="bg-muted h-2.5 w-3/4 rounded" aria-hidden="true"></div>
									<div class="bg-muted h-2 w-1/2 rounded" aria-hidden="true"></div>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</main>
		</div>
	</div>
</Tooltip.Provider>
