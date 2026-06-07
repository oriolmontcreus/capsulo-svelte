import { Extension } from "@tiptap/core";
import { Plugin } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

import { getVariableNodeClassName } from "./variable-dom";

const VARIABLE_PATTERN = /\{\{[^}]+\}\}/g;

function buildVariableDecorations(doc: import("@tiptap/pm/model").Node): DecorationSet {
	const decorations: Decoration[] = [];

	doc.descendants((node, pos) => {
		if (!node.isText) return;

		const text = node.text ?? "";
		VARIABLE_PATTERN.lastIndex = 0;

		for (const match of text.matchAll(VARIABLE_PATTERN)) {
			const start = pos + match.index;
			const end = start + match[0].length;
			const variableName = match[0].slice(2, -2).trim();
			decorations.push(
				Decoration.inline(start, end, {
					class: getVariableNodeClassName(),
					"data-global-variable": variableName
				})
			);
		}
	});

	return DecorationSet.create(doc, decorations);
}

export function createGlobalVariableHighlightExtension() {
	return Extension.create({
		name: "globalVariableHighlight",
		addProseMirrorPlugins() {
			return [
				new Plugin({
					props: {
						decorations(state) {
							return buildVariableDecorations(state.doc);
						}
					}
				})
			];
		}
	});
}
