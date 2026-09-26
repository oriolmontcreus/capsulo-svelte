import { Marked, type Tokens } from "marked";

/**
 * Markdown for the agent's replies: GitHub-flavoured (headings, lists, tables, code
 * blocks, strikethrough, links). The text comes from a model that also reads site
 * content, so raw HTML is shown as text, links are limited to safe protocols and
 * images are replaced by their alt text: nothing it writes can run in the admin.
 */
const SAFE_HREF = /^(https?:|mailto:|\/(?!\/)|#)/i;

function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const marked = new Marked({
	gfm: true,
	breaks: true,
	renderer: {
		html({ text }: Tokens.HTML | Tokens.Tag) {
			return escapeHtml(text);
		},
		link({ href, title, tokens }: Tokens.Link) {
			const label = this.parser.parseInline(tokens);
			if (!SAFE_HREF.test(href.trim())) return label;
			const titleAttribute = title ? ` title="${escapeHtml(title)}"` : "";
			return `<a href="${escapeHtml(href.trim())}"${titleAttribute} target="_blank" rel="noopener noreferrer">${label}</a>`;
		},
		image({ text }: Tokens.Image) {
			return escapeHtml(text);
		},
		table(token: Tokens.Table) {
			// Wide tables scroll inside the narrow sidebar instead of overflowing it.
			const header = token.header.map((cell) => this.tablecell(cell)).join("");
			const rows = token.rows.map((row) => `<tr>${row.map((cell) => this.tablecell(cell)).join("")}</tr>`).join("");
			return `<div class="ai-table"><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>`;
		},
	},
});

export function renderMarkdown(markdown: string): string {
	return marked.parse(markdown, { async: false });
}
