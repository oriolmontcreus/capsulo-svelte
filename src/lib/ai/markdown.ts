/**
 * Tiny Markdown subset for the agent's replies: paragraphs, bullet and numbered lists,
 * **bold**, *italic*, `code` and [links](https://…). Everything is escaped first, so
 * model output can never inject HTML into the admin.
 */
function escapeHtml(text: string): string {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
	return escapeHtml(text)
		.replace(/`([^`]+)`/g, '<code class="bg-muted rounded px-1 py-0.5 text-[0.85em]">$1</code>')
		.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
		.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
		.replace(
			/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g,
			'<a href="$2" class="underline underline-offset-2" target="_blank" rel="noopener noreferrer">$1</a>'
		);
}

export function renderMarkdown(markdown: string): string {
	const blocks: string[] = [];
	let list: { ordered: boolean; items: string[] } | null = null;
	let paragraph: string[] = [];

	const flushParagraph = () => {
		if (paragraph.length) blocks.push(`<p>${paragraph.map(renderInline).join("<br>")}</p>`);
		paragraph = [];
	};
	const flushList = () => {
		if (!list) return;
		const tag = list.ordered ? "ol" : "ul";
		const style = list.ordered ? "list-decimal" : "list-disc";
		blocks.push(`<${tag} class="${style} space-y-0.5 pl-5">${list.items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</${tag}>`);
		list = null;
	};

	for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
		const line = rawLine.trimEnd();
		const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
		const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
		if (bullet || numbered) {
			flushParagraph();
			const ordered = Boolean(numbered);
			if (list && list.ordered !== ordered) flushList();
			list ??= { ordered, items: [] };
			list.items.push((bullet ?? numbered)![1]);
			continue;
		}
		if (line.trim() === "") {
			flushParagraph();
			flushList();
			continue;
		}
		flushList();
		// Headings read as bold lines in a narrow sidebar.
		const heading = /^#{1,6}\s+(.*)$/.exec(line);
		paragraph.push(heading ? `**${heading[1]}**` : line);
	}
	flushParagraph();
	flushList();
	return blocks.join("");
}
