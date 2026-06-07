import type { Editor } from "@tiptap/core";

export function insertVariableToken(
	editor: Editor,
	key: string,
	replaceFrom: number,
	replaceTo: number
): void {
	editor
		.chain()
		.focus()
		.deleteRange({ from: replaceFrom, to: replaceTo })
		.insertContent(`{{${key}}}`)
		.run();
}
