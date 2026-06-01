import type { SelectFieldBuilder, SelectFieldDefinition } from "./select-field.types";
import type { SelectOption, SelectOptionGroup, InternalLinksConfig, ResponsiveColumns } from "../../core/types";

class SelectFieldBuilderImpl implements SelectFieldBuilder {
	private field: SelectFieldDefinition;

	constructor(name: string) {
		this.field = {
			type: "select",
			name
		};
	}

	label(value: string): this {
		this.field.label = value;
		return this;
	}

	description(value: string): this {
		this.field.description = value;
		return this;
	}

	placeholder(value: string): this {
		this.field.placeholder = value;
		return this;
	}

	required(value = true): this {
		this.field.required = value;
		return this;
	}

	multiple(value = true): this {
		this.field.multiple = value;
		return this;
	}

	defaultValue(value: string | string[]): this {
		this.field.defaultValue = value;
		return this;
	}

	options(value: SelectOption[]): this {
		this.field.options = value;
		return this;
	}

	groups(value: SelectOptionGroup[]): this {
		this.field.groups = value;
		return this;
	}

	searchable(value = true): this {
		this.field.searchable = value;
		return this;
	}

	searchPlaceholder(value: string): this {
		this.field.searchPlaceholder = value;
		return this;
	}

	emptyMessage(value: string): this {
		this.field.emptyMessage = value;
		return this;
	}

	columns(value: number | ResponsiveColumns): this {
		this.field.columns = value;
		return this;
	}

	highlightMatches(value = true): this {
		this.field.highlightMatches = value;
		return this;
	}

	minSearchLength(value: number): this {
		this.field.minSearchLength = value;
		return this;
	}

	internalLinks(autoResolveLocale = true, groupBySection = false): this {
		this.field.internalLinks = {
			autoResolveLocale,
			groupBySection
		};
		return this;
	}

	colSpan(value: number | "full" | ResponsiveColumns): this {
		this.field.colSpan = value;
		return this;
	}

	build(): SelectFieldDefinition {
		return { ...this.field };
	}
}

export const Select = (name: string): SelectFieldBuilder =>
	new SelectFieldBuilderImpl(name);