import { cn } from "$lib/utils";

/**
 * Outer shell only — border, background, focus ring. No padding.
 * Padding lives on `.ProseMirror` so we avoid the nested-box look.
 */
export const variableInputSurfaceClass = cn(
	"border-input dark:bg-input/30 bg-white",
	"focus-within:border-ring focus-within:ring-ring/50",
	"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
	"aria-invalid:border-destructive dark:aria-invalid:border-destructive/50",
	"h-9 w-full overflow-hidden rounded-md border shadow-xs",
	"transition-[color,box-shadow] focus-within:ring-3 aria-invalid:ring-3"
);

/** Outer shell for textarea — border, background, focus ring. No padding. */
export const variableTextareaSurfaceClass = cn(
	"border-input dark:bg-input/30 bg-white",
	"focus-within:border-ring focus-within:ring-ring/50",
	"aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
	"aria-invalid:border-destructive dark:aria-invalid:border-destructive/50",
	"w-full overflow-hidden rounded-md border shadow-xs",
	"transition-[color,box-shadow] focus-within:ring-3 aria-invalid:ring-3"
);

export const variableEditorClass = cn(
	"selection:bg-primary selection:text-primary-foreground h-full w-full min-w-0"
);
