/**
 * Rich-editor values are rendered as HTML on the public site, so HTML written by the
 * model is reduced to the markup the rich editor itself produces. Anything else
 * (scripts, event handlers, styles, iframes) is dropped; the text inside is kept.
 */
const ALLOWED_TAGS = new Set([
	"p", "br", "strong", "b", "em", "i", "u", "s", "code", "pre", "blockquote",
	"h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "hr", "a"
]);
const DROPPED_WITH_CONTENT = new Set(["script", "style", "template", "iframe", "object", "embed", "noscript"]);
const SAFE_HREF = /^(https?:|mailto:|tel:|\/|#)/i;

function escapeText(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
	return escapeText(value).replace(/"/g, "&quot;");
}

function serialize(node: Node): string {
	if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? "");
	if (node.nodeType !== Node.ELEMENT_NODE) return "";

	const element = node as Element;
	const tag = element.tagName.toLowerCase();
	if (DROPPED_WITH_CONTENT.has(tag)) return "";
	const children = Array.from(element.childNodes).map(serialize).join("");
	if (!ALLOWED_TAGS.has(tag)) return children;
	if (tag === "br" || tag === "hr") return `<${tag}>`;

	let attributes = "";
	if (tag === "a") {
		const href = element.getAttribute("href")?.trim() ?? "";
		if (SAFE_HREF.test(href)) attributes += ` href="${escapeAttribute(href)}"`;
		if (element.getAttribute("target") === "_blank") attributes += ' target="_blank" rel="noopener noreferrer nofollow"';
	}
	return `<${tag}${attributes}>${children}</${tag}>`;
}

export function sanitizeRichText(input: string): string {
	const trimmed = input.trim();
	if (trimmed === "") return "";
	if (!/<[a-z!/]/i.test(trimmed)) {
		// Plain text: one paragraph per blank-line separated block, single newlines as <br>.
		return trimmed
			.split(/\n\s*\n/)
			.map((block) => `<p>${escapeText(block.trim()).replace(/\n/g, "<br>")}</p>`)
			.join("");
	}
	const document = new DOMParser().parseFromString(`<body>${trimmed}</body>`, "text/html");
	return Array.from(document.body.childNodes).map(serialize).join("");
}
