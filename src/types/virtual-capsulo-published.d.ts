declare module "virtual:capsulo/published" {
	export type PublishedContent = {
		/** Stored page documents keyed by page id (see `serializePageEditorValues`). */
		pages: Record<string, unknown>;
		globals: unknown;
	};

	/**
	 * Server-only (Astro frontmatter): published content for the static build / dev server.
	 * `requestUrl` (Astro.url) is only used by `astro dev`, which reads it from its own API.
	 */
	export function loadPublishedContent(requestUrl: URL): Promise<PublishedContent>;
}
