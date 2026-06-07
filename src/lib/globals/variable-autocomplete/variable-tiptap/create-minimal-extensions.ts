import type { Extensions } from "@tiptap/core";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";

import { createGlobalVariableHighlightExtension } from "../global-variable-highlight-extension";
import { SingleLineExtension } from "./single-line-extension";

export type MinimalEditorMode = "singleline" | "multiline";

export function createMinimalExtensions(
	mode: MinimalEditorMode,
	placeholder = ""
): Extensions {
	const extensions: Extensions = [
		StarterKit.configure({
			blockquote: false,
			bold: false,
			bulletList: false,
			code: false,
			codeBlock: false,
			dropcursor: false,
			gapcursor: false,
			heading: false,
			horizontalRule: false,
			italic: false,
			listItem: false,
			orderedList: false,
			strike: false,
			hardBreak: mode === "multiline"
		}),
		Placeholder.configure({ placeholder }),
		createGlobalVariableHighlightExtension()
	];

	if (mode === "singleline") {
		extensions.push(SingleLineExtension);
	}

	return extensions;
}
