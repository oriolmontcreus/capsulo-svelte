import type { GlobalVariableValues } from "$lib/globals/resolve-globals";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

/** Id of the `<script type="application/json">` that carries a page's published content. */
export const PUBLISHED_ELEMENT_ID = "capsulo-published";

/** What a public page embeds: its capsules' values and the global variables for its locale. */
export type PublishedPageContent = {
	values: PageEditorValuesByInstance;
	variables: GlobalVariableValues;
};

const EMPTY_CONTENT: PublishedPageContent = { values: {}, variables: {} };

let serverContent: PublishedPageContent = EMPTY_CONTENT;
const parsedByElement = new WeakMap<Element, PublishedPageContent>();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Called by the middleware before the page's islands render, so their server render
 * already contains the published content (static builds render one page at a time).
 */
export function setServerPublishedContent(content: PublishedPageContent): void {
	serverContent = content;
}

/**
 * Published content for the current page. On the client it comes from the JSON the
 * layout embeds, read lazily so every island sees it however hydration is ordered
 * (including after a ClientRouter navigation swaps the body).
 */
function getPublishedContent(): PublishedPageContent {
	if (typeof document === "undefined") return serverContent;

	const element = document.getElementById(PUBLISHED_ELEMENT_ID);
	if (!element) return EMPTY_CONTENT;

	let content = parsedByElement.get(element);
	if (!content) {
		content = EMPTY_CONTENT;
		try {
			const parsed: unknown = JSON.parse(element.textContent || "{}");
			if (isRecord(parsed)) {
				content = {
					values: isRecord(parsed.values) ? (parsed.values as PageEditorValuesByInstance) : {},
					variables: isRecord(parsed.variables) ? (parsed.variables as GlobalVariableValues) : {}
				};
			}
		} catch {
			// Keep the empty content: capsules fall back to their schema defaults.
		}
		parsedByElement.set(element, content);
	}
	return content;
}

export function getPublishedValues(): PageEditorValuesByInstance {
	return getPublishedContent().values;
}

/** Published global variables, already resolved for the page's locale. */
export function getPublishedVariables(): GlobalVariableValues {
	return getPublishedContent().variables;
}
