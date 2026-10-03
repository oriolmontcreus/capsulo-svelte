import capsuleManifest from "virtual:capsule-manifest";
import { listPageInstances } from "$lib/capsules/core/page-instances";
import { getCapsuleByKey } from "$lib/capsules/core/registry";
import {
	GLOBALS_INSTANCE_ID,
	validatePageContent,
	type ContentIssue
} from "$lib/capsules/core/validate-content";
import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
import { normalizeRepeaterItems, repeaterItemValues } from "$lib/form-builder/core/translation-runtime";
import type { FieldDefinition, SchemaValues } from "$lib/form-builder/core/types";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";
import { getCapsuleDisplayTitle } from "$lib/PageEditor/ContentSidebar/capsule-instances";
import { pageDisplayName } from "$lib/PageEditor/changes/changed-pages";

export const VALIDATION_OPTIONS = { defaultLocale: DEFAULT_LOCALE, locales: LOCALES };

export type PageIssue = ContentIssue & { pageId: string };

/** One row of an issue list: where the problem is, what it is, and a link to fix it. */
export type IssueListEntry = {
	key: string;
	pageId: string;
	pageName: string;
	/** "Hero" or "Hero 2" when a page has several. */
	capsuleTitle: string;
	/** Field labels from the capsule down, e.g. ["Speakers", "Speaker 2", "Website"]. */
	location: string[];
	/** Set when the problem is in a translation (not the default locale). */
	locale: string | null;
	message: string;
	href: string;
};

/** Validates a page's draft against the capsules it renders (per the capsule manifest). */
export function validatePageValues(pageId: string, valuesByInstance: PageEditorValuesByInstance): PageIssue[] {
	const instances = listPageInstances(capsuleManifest[pageId] ?? []);
	return validatePageContent(
		instances,
		valuesByInstance,
		(capsuleKey) => getCapsuleByKey(capsuleKey)?.schema,
		VALIDATION_OPTIONS
	).map((issue) => ({ ...issue, pageId }));
}

/** Page editor link that opens the field: right capsule, repeater item and language. */
function issueHref(issue: Pick<PageIssue, "pageId" | "instanceId" | "path" | "locale">): string {
	const params = new URLSearchParams({ field: issue.path.join(".") });
	if (issue.locale !== DEFAULT_LOCALE) params.set("locale", issue.locale);
	if (issue.instanceId === GLOBALS_INSTANCE_ID) return `/admin/globals?${params}`;
	params.set("focus", issue.instanceId);
	return `/admin/page-editor/${issue.pageId}?${params}`;
}

/** Labels along an issue path; repeater item ids become "Speaker 2". */
function describeIssuePath(fields: FieldDefinition[], values: SchemaValues, path: string[]): string[] {
	const labels: string[] = [];
	let currentFields = fields;
	let currentValues = values;

	for (let index = 0; index < path.length; index += 1) {
		const field = currentFields.find((candidate) => candidate.name === path[index]);
		if (!field) break;
		labels.push(field.label ?? field.name);
		if (field.type !== "repeater" || index + 1 >= path.length) continue;

		const itemId = path[index + 1];
		const items = normalizeRepeaterItems(currentValues[field.name]?.[DEFAULT_LOCALE]);
		const itemIndex = items.findIndex((item) => item._id === itemId);
		labels.push(`${field.itemName ?? "Item"} ${itemIndex + 1}`);
		currentFields = field.fields;
		currentValues = itemIndex >= 0 ? repeaterItemValues(items[itemIndex]) : {};
		index += 1;
	}

	return labels;
}

function instanceNumber(instanceId: string): number {
	return Number(instanceId.match(/-(\d+)$/)?.[1] ?? 1);
}

export function toIssueListEntries(issues: PageIssue[], valuesByPage: Record<string, PageEditorValuesByInstance>): IssueListEntry[] {
	return issues.map((issue, index) => {
		const capsule = getCapsuleByKey(issue.capsuleKey);
		const count = listPageInstances(capsuleManifest[issue.pageId] ?? []).filter(
			(instance) => instance.capsuleKey === issue.capsuleKey
		).length;
		const title = getCapsuleDisplayTitle(issue.capsuleKey, issue.capsuleKey);
		return {
			key: `${issue.pageId}:${issue.instanceId}:${issue.path.join(".")}@${issue.locale}:${index}`,
			pageId: issue.pageId,
			pageName: pageDisplayName(issue.pageId),
			capsuleTitle: count > 1 ? `${title} ${instanceNumber(issue.instanceId)}` : title,
			location: capsule
				? describeIssuePath(capsule.schema.fields, valuesByPage[issue.pageId]?.[issue.instanceId] ?? {}, issue.path)
				: [issue.label],
			locale: issue.locale === DEFAULT_LOCALE ? null : issue.locale,
			message: issue.message,
			href: issueHref(issue)
		};
	});
}
