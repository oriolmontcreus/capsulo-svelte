<script lang="ts">
	import { onMount } from "svelte";
	import { initCmsPreview, teardownCmsPreview } from "$lib/cms/cms-preview-runtime";
	import { resetPreviewStore } from "$lib/cms/preview-store.svelte";
	import { PAGE_EDITOR_PREVIEW_PARAM } from "$lib/PageEditor/preview-channel";

	function pathnameToPageId(pathname: string): string {
		const clean = pathname.replace(/\/+$/, "");
		if (!clean || clean === "/") return "index";
		return clean
			.split("/")
			.filter(Boolean)
			.map((segment) => decodeURIComponent(segment))
			.join("/");
	}

	async function bootCmsPreview(): Promise<void> {
		if (typeof window === "undefined") return;

		const params = new URLSearchParams(window.location.search);
		const isPreview = params.get(PAGE_EDITOR_PREVIEW_PARAM) === "1";

		if (!isPreview) {
			teardownCmsPreview();
			resetPreviewStore();
			return;
		}

		const pageId = pathnameToPageId(window.location.pathname);
		await initCmsPreview(pageId);
	}

	onMount(() => {
		const handlePageLoad = () => {
			void bootCmsPreview();
		};

		document.addEventListener("astro:page-load", handlePageLoad);
		void bootCmsPreview();

		return () => {
			document.removeEventListener("astro:page-load", handlePageLoad);
			teardownCmsPreview();
			resetPreviewStore();
		};
	});
</script>

<!-- Invisible island: wires preview postMessage into the shared preview store. -->
