import { Extension } from "@tiptap/core";

export const SingleLineExtension = Extension.create({
	name: "singleLine",
	addKeyboardShortcuts() {
		return {
			Enter: () => true,
			"Shift-Enter": () => true
		};
	}
});
