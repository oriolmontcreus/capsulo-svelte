import capsuleManifest from "virtual:capsule-manifest";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import type {
	SelectFieldDefinition,
	SelectOption,
	SelectOptionGroup,
} from "../../../core/types";

export interface ResolvedSelectData {
	options: SelectOption[];
	groups: SelectOptionGroup[];
	hasGroups: boolean;
}

function formatPageLabel(pageId: string): string {
	if (pageId === "index") return "Home";
	return pageId
		.split("/")
		.map((segment) =>
			segment
				.split("-")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" "),
		)
		.join(" / ");
}

function formatPagePath(pageId: string, locale: string, autoResolveLocale: boolean): string {
	const basePath = pageId === "index" ? "/" : `/${pageId}`;
	if (!autoResolveLocale) return basePath;
	if (pageId === "index") return `/${locale}`;
	return `/${locale}${basePath}`;
}

function getSectionLabel(pageId: string): string {
	if (!pageId.includes("/")) return "Pages";
	const section = pageId.split("/")[0] ?? "pages";
	return section
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}

function buildInternalLinkOptions(
	field: SelectFieldDefinition,
	locale = DEFAULT_LOCALE,
): ResolvedSelectData {
	const config = field.internalLinks ?? {};
	const autoResolveLocale = config.autoResolveLocale ?? true;
	const groupBySection = config.groupBySection ?? false;
	const pageIds = Object.keys(capsuleManifest).sort();

	if (groupBySection) {
		const groupsBySection = new Map<string, SelectOption[]>();

		for (const pageId of pageIds) {
			const section = getSectionLabel(pageId);
			const options = groupsBySection.get(section) ?? [];
			options.push({
				label: formatPageLabel(pageId),
				value: formatPagePath(pageId, locale, autoResolveLocale),
				description: pageId,
			});
			groupsBySection.set(section, options);
		}

		const groups = Array.from(groupsBySection.entries())
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([label, options]) => ({ label, options }));

		return { options: [], groups, hasGroups: groups.length > 0 };
	}

	const options = pageIds.map((pageId) => ({
		label: formatPageLabel(pageId),
		value: formatPagePath(pageId, locale, autoResolveLocale),
		description: pageId,
	}));

	return { options, groups: [], hasGroups: false };
}

export function resolveSelectData(
	field: SelectFieldDefinition,
	locale = DEFAULT_LOCALE,
): ResolvedSelectData {
	if (field.internalLinks) {
		return buildInternalLinkOptions(field, locale);
	}

	const groups = field.groups ?? [];
	if (groups.length > 0) {
		return { options: [], groups, hasGroups: true };
	}

	return {
		options: field.options ?? [],
		groups: [],
		hasGroups: false,
	};
}

export function getAllOptions(data: ResolvedSelectData): SelectOption[] {
	if (data.hasGroups) {
		return data.groups.flatMap((group) => group.options);
	}
	return data.options;
}
