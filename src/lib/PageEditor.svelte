<script lang="ts">
	import * as Tooltip from "$lib/components/ui/tooltip";

	import Topbar from "./PageEditor/Topbar.svelte";
	import ContentSidebar from "./PageEditor/ContentSidebar.svelte";
	import Preview from "./PageEditor/Preview.svelte";

	type Viewport = "desktop" | "tablet" | "mobile";

	let viewport = $state<Viewport>("desktop");
	let locale = $state<string>("en-US");

	const viewportWidths: Record<Viewport, string> = {
		desktop: "100%",
		tablet: "820px",
		mobile: "390px"
	};

	const previewWidth = $derived(viewportWidths[viewport]);

	let internalName = $state({ value: "Homepage" });
	let pageName = $state({ value: "The card you always wanted" });
	let slug = $state({ value: "home" });
</script>

<Tooltip.Provider delayDuration={150}>
	<div class="bg-background text-foreground flex h-dvh w-full flex-col overflow-hidden">
		<!-- Topbar -->
		<Topbar bind:viewport bind:locale />

		<!-- Body -->
		<div class="flex min-h-0 flex-1">
			<!-- Sidebar -->
			<ContentSidebar bind:internalName bind:pageName bind:slug />

			<!-- Preview pane -->
			<Preview previewWidth={previewWidth} />
		</div>
	</div>
</Tooltip.Provider>
