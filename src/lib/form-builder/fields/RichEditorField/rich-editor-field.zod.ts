import { z } from "zod";
import type { RichEditorFieldDefinition } from "./rich-editor-field.types";

function htmlToPlainText(html: string): string {
	// Fast + dependency-free strip suitable for "required" checks.
	// Note: TipTap empty doc is often "<p></p>" or "<p><br></p>".
	return html
		.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
		.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/\u00a0/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function richEditorFieldToZod(
	field: RichEditorFieldDefinition,
	defaultLocale: string,
) {
	const base = z.record(z.string(), z.string());

	if (!field.required) return base;

	return base.refine(
		(valueByLocale) => {
			const html = valueByLocale[defaultLocale];
			return typeof html === "string" && htmlToPlainText(html).length > 0;
		},
		{
			message: `${field.label ?? field.name} is required in ${defaultLocale}`,
		},
	);
}

