import type {
	ResolvedSelectData,
} from "./resolve-options";
import type { SelectFieldDefinition, SelectOption } from "../../../core/types";

function createOptionMatcher(field: SelectFieldDefinition) {
	const minSearchLength = field.minSearchLength ?? 0;

	return function optionMatchesSearch(option: SelectOption, query: string): boolean {
		const normalizedQuery = query.trim().toLowerCase();
		if (normalizedQuery.length < minSearchLength) return true;

		const haystacks = [option.label, option.value, option.description ?? ""];
		return haystacks.some((part) => part.toLowerCase().includes(normalizedQuery));
	};
}

function filterOptions(
	options: SelectOption[],
	query: string,
	field: SelectFieldDefinition,
): SelectOption[] {
	const matcher = createOptionMatcher(field);
	return options.filter((option) => matcher(option, query));
}

export function filterResolvedData(
	data: ResolvedSelectData,
	query: string,
	field: SelectFieldDefinition,
): ResolvedSelectData {
	if (data.hasGroups) {
		const groups = data.groups
			.map((group) => ({
				...group,
				options: filterOptions(group.options, query, field),
			}))
			.filter((group) => group.options.length > 0);

		return { options: [], groups, hasGroups: groups.length > 0 };
	}

	return {
		options: filterOptions(data.options, query, field),
		groups: [],
		hasGroups: false,
	};
}

export function countResolvedOptions(data: ResolvedSelectData): number {
	if (data.hasGroups) {
		return data.groups.reduce((total, group) => total + group.options.length, 0);
	}
	return data.options.length;
}
