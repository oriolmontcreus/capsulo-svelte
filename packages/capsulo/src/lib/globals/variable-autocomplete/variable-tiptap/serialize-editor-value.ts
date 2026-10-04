import type { Editor } from "@tiptap/core";

export function serializeEditorValue(editor: Editor, singleLine: boolean): string {
	const text = editor.getText();
	if (!singleLine) return text;
	return text.replace(/\r?\n/g, "");
}

export function normalizePastedText(text: string, singleLine: boolean): string {
	if (!singleLine) return text;
	return text.replace(/\r?\n/g, "");
}
