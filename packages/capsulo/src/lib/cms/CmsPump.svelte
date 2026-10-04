<script lang="ts">
	import { onMount } from "svelte";
	import { initCmsPreview, teardownCmsPreview } from "$lib/cms/cms-preview-runtime";
	import { resetPreviewStore, syncSiteLocaleFromPathname } from "$lib/cms/cms-store.svelte";
	import { pathnameToPageId } from "$lib/i18n/routing";
	import { PAGE_EDITOR_PREVIEW_PARAM } from "$lib/PageEditor/preview-channel";

	async function bootCmsRuntime(): Promise<void> {
		if (typeof window === "undefined") return;

		const { pathname } = window.location;
		syncSiteLocaleFromPathname(pathname);

		const params = new URLSearchParams(window.location.search);
		const isPreview = params.get(PAGE_EDITOR_PREVIEW_PARAM) === "1";

		if (!isPreview) {
			teardownCmsPreview();
			resetPreviewStore();
			return;
		}

		const pageId = pathnameToPageId(pathname);
		await initCmsPreview(pageId);
	}

	onMount(() => {
		const handlePageLoad = () => {
			void bootCmsRuntime();
		};

		document.addEventListener("astro:page-load", handlePageLoad);
		void bootCmsRuntime();

		return () => {
			document.removeEventListener("astro:page-load", handlePageLoad);
			teardownCmsPreview();
			resetPreviewStore();
		};
	});
</script>

<!-- Invisible island: syncs URL locale and wires preview postMessage into the shared CMS store. -->
