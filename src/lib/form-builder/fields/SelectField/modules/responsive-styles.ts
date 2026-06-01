import type { ResponsiveColumns, SelectFieldDefinition } from "../../../core/types";

let selectIdCounter = 0;

export function createSelectGridId(): string {
	selectIdCounter += 1;
	return `select-grid-${selectIdCounter}`;
}

export function hasMultipleColumns(field: SelectFieldDefinition): boolean {
	if (!field.columns) return false;
	if (typeof field.columns === "number") return field.columns > 1;
	const columns = field.columns;
	return [columns.base, columns.sm, columns.md, columns.lg, columns.xl].some(
		(count) => (count ?? 0) > 1,
	);
}

export function getBaseColumnCount(field: SelectFieldDefinition): number {
	if (!field.columns) return 1;
	if (typeof field.columns === "number") return Math.max(1, field.columns);
	return Math.max(1, field.columns.base ?? 1);
}

export function getBaseGridStyle(field: SelectFieldDefinition): string {
	const columns = getBaseColumnCount(field);
	return `display:grid;grid-template-columns:repeat(${columns},minmax(0,1fr));gap:0.25rem;width:100%;`;
}

/** Inline grid styles — omitted when responsive CSS handles layout (inline would override media queries). */
export function getGridInlineStyle(field: SelectFieldDefinition): string | undefined {
	if (!hasMultipleColumns(field)) return undefined;
	if (shouldInjectResponsiveStyles(field)) return undefined;
	return getBaseGridStyle(field);
}

export function getMaxColumnCount(field: SelectFieldDefinition): number {
	if (!field.columns) return 1;
	if (typeof field.columns === "number") return Math.max(1, field.columns);
	const columns = field.columns;
	return Math.max(
		1,
		columns.base ?? 1,
		columns.sm ?? 0,
		columns.md ?? 0,
		columns.lg ?? 0,
		columns.xl ?? 0,
	);
}

const RESPONSIVE_BREAKPOINTS: Array<{ key: keyof ResponsiveColumns; minWidth: string }> =
	[
		{ key: "sm", minWidth: "640px" },
		{ key: "md", minWidth: "768px" },
		{ key: "lg", minWidth: "1024px" },
		{ key: "xl", minWidth: "1280px" },
	];

export function generateResponsiveStyles(
	selectId: string,
	columns: ResponsiveColumns,
): string {
	const base = Math.max(1, columns.base ?? 1);
	const rules = [
		`[data-select-id="${selectId}"]{display:grid;gap:0.25rem;width:100%;grid-template-columns:repeat(${base},minmax(0,1fr));}`,
	];

	for (const { key, minWidth } of RESPONSIVE_BREAKPOINTS) {
		const count = columns[key];
		if (!count || count < 1) continue;
		rules.push(
			`@media (min-width:${minWidth}){[data-select-id="${selectId}"]{grid-template-columns:repeat(${count},minmax(0,1fr));}}`,
		);
	}

	return rules.join("");
}

export function shouldInjectResponsiveStyles(field: SelectFieldDefinition): boolean {
	return typeof field.columns === "object" && field.columns !== null;
}

export function getDropdownMinWidth(field: SelectFieldDefinition): string | undefined {
	if (!hasMultipleColumns(field)) return undefined;
	const columns = shouldInjectResponsiveStyles(field)
		? getMaxColumnCount(field)
		: getBaseColumnCount(field);
	return `${Math.max(columns * 9, 16)}rem`;
}
