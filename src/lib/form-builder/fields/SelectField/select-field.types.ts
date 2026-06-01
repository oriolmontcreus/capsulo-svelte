import type {
	FieldBuilder,
	SelectFieldDefinition,
	SelectOption,
	SelectOptionGroup,
	InternalLinksConfig,
	ResponsiveColumns
} from "../../core/types";

export type {
	SelectFieldDefinition,
	SelectOption,
	SelectOptionGroup,
	InternalLinksConfig,
	ResponsiveColumns
};

export interface SelectFieldBuilder extends FieldBuilder<SelectFieldDefinition> {
	label(value: string): this;
	description(value: string): this;
	placeholder(value: string): this;
	required(value?: boolean): this;
	multiple(value?: boolean): this;
	defaultValue(value: string | string[]): this;
	options(value: SelectOption[]): this;
	groups(value: SelectOptionGroup[]): this;
	searchable(value?: boolean): this;
	searchPlaceholder(value: string): this;
	emptyMessage(value: string): this;
	columns(value: number | ResponsiveColumns): this;
	highlightMatches(value?: boolean): this;
	minSearchLength(value: number): this;
	internalLinks(autoResolveLocale?: boolean, groupBySection?: boolean): this;
	colSpan(value: number | "full" | ResponsiveColumns): this;
}