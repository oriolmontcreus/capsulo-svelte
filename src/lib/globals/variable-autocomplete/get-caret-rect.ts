import type { Editor } from "@tiptap/core";

export function getCaretRect(editor: Editor, pos?: number): DOMRect {
	const position = pos ?? editor.state.selection.from;
	const coords = editor.view.coordsAtPos(position);
	return new DOMRect(coords.left, coords.top, 0, Math.max(coords.bottom - coords.top, 0));
}
