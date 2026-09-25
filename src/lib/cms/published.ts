import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

/** Id of the `<script type="application/json">` that carries a page's published values. */
export const PUBLISHED_ELEMENT_ID = "capsulo-published";

let serverValues: PageEditorValuesByInstance = {};
const parsedByElement = new WeakMap<Element, PageEditorValuesByInstance>();

/**
 * Called by Layout.astro before the page's islands render, so their server render
 * already contains the published content (static builds render one page at a time).
 */
export function setServerPublishedValues(values: PageEditorValuesByInstance): void {
	serverValues = values;
}

/**
 * Published values for the current page. On the client they come from the JSON the
 * layout embeds, read lazily so every island sees them however hydration is ordered
 * (including after a ClientRouter navigation swaps the body).
 */
export function getPublishedValues(): PageEditorValuesByInstance {
	if (typeof document === "undefined") return serverValues;

	const element = document.getElementById(PUBLISHED_ELEMENT_ID);
	if (!element) return {};

	let values = parsedByElement.get(element);
	if (!values) {
		try {
			values = JSON.parse(element.textContent || "{}") as PageEditorValuesByInstance;
		} catch {
			values = {};
		}
		parsedByElement.set(element, values);
	}
	return values;
}
