import type { Editor } from "@tiptap/core";

import type { AutocompleteTrigger } from "./types";

const TRIGGER_PATTERN = /\{\{([a-zA-Z0-9_]*)$/;

export function detectAutocompleteTrigger(editor: Editor): AutocompleteTrigger | null {
	const { selection } = editor.state;
	if (!selection.empty) return null;

	const $from = selection.$from;
	if (!$from.parent.isTextblock) return null;

	const textBefore = $from.parent.textBetween(0, $from.parentOffset, null, "\ufffc");
	const match = textBefore.match(TRIGGER_PATTERN);
	if (!match) return null;

	const matchLength = match[0].length;
	return {
		query: match[1],
		replaceFrom: $from.pos - matchLength,
		replaceTo: $from.pos
	};
}
