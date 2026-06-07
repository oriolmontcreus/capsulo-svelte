import { cn } from "$lib/utils";

import { variableEditorClass } from "../field-surface-styles";

/** TipTap mount node — transparent pass-through, no scrollbars. */
export const variableTipTapMountClass = cn(
	variableEditorClass,
	"overflow-hidden outline-none"
);

export const singlelineEditorClass = cn(
	variableTipTapMountClass,
	"[&_.ProseMirror]:text-foreground [&_.ProseMirror]:m-0 [&_.ProseMirror]:h-full [&_.ProseMirror]:min-h-0",
	"[&_.ProseMirror]:overflow-hidden [&_.ProseMirror]:border-0 [&_.ProseMirror]:bg-transparent [&_.ProseMirror]:outline-none",
	"[&_.ProseMirror]:px-2.5 [&_.ProseMirror]:py-1 [&_.ProseMirror]:text-base md:[&_.ProseMirror]:text-sm",
	"[&_.ProseMirror]:flex [&_.ProseMirror]:items-center",
	"[&_.ProseMirror_p]:m-0 [&_.ProseMirror_p]:block [&_.ProseMirror_p]:w-full [&_.ProseMirror_p]:whitespace-nowrap"
);

export const multilineEditorClass = cn(
	variableTipTapMountClass,
	"[&_.ProseMirror]:text-foreground [&_.ProseMirror]:m-0 [&_.ProseMirror]:min-h-full",
	"[&_.ProseMirror]:overflow-hidden [&_.ProseMirror]:border-0 [&_.ProseMirror]:bg-transparent [&_.ProseMirror]:outline-none",
	"[&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:text-base md:[&_.ProseMirror]:text-sm",
	"[&_.ProseMirror]:whitespace-pre-wrap [&_.ProseMirror]:align-top"
);

export function getMultilineMinHeight(rows: number): string {
	const lineHeight = 24;
	return `${(rows || 3) * lineHeight}px`;
}
