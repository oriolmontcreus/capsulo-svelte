import capsuleManifest from "virtual:capsule-manifest";
import { globalsSchema } from "$/config/globals/globals.schema";
import { listPageInstances } from "$lib/capsules/core/page-instances";
import { getCapsuleSchemaByKey } from "$lib/capsules/core/schema-registry";
import {
	formatContentIssue,
	validateGlobalsContent,
	validatePageContent,
	type ContentIssue
} from "$lib/capsules/core/validate-content";
import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
import { deserializeGlobalsValues } from "$lib/globals/globals-persistence";
import { deserializePageEditorValues } from "$lib/PageEditor/persistence";
import { HttpError } from "./http";

const OPTIONS = { defaultLocale: DEFAULT_LOCALE, locales: LOCALES };

export type PageContentIssue = ContentIssue & { pageId: string };

/** The same check the Changes page runs before it lets anyone commit. */
export function findPageContentIssues(pageId: string, content: unknown): PageContentIssue[] {
	const instances = listPageInstances(capsuleManifest[pageId] ?? []);
	return validatePageContent(instances, deserializePageEditorValues(content), getCapsuleSchemaByKey, OPTIONS).map(
		(issue) => ({ ...issue, pageId })
	);
}

function rejectInvalid(issues: Array<ContentIssue & { pageId?: string }>): never {
	const summary = issues
		.slice(0, 5)
		.map((issue) => `${issue.pageId ? `${issue.pageId}: ` : ""}${formatContentIssue(issue, DEFAULT_LOCALE)}`)
		.join("; ");
	const more = issues.length > 5 ? ` (and ${issues.length - 5} more)` : "";
	throw new HttpError(422, `Some content is invalid, so nothing was saved. ${summary}${more}`, { issues });
}

export function assertValidPages(pages: Array<{ pageId: string; content: unknown }>): void {
	const issues = pages.flatMap((page) => findPageContentIssues(page.pageId, page.content));
	if (issues.length > 0) rejectInvalid(issues);
}

export function assertValidGlobals(content: unknown): void {
	const issues = validateGlobalsContent(globalsSchema, deserializeGlobalsValues(content), OPTIONS);
	if (issues.length > 0) rejectInvalid(issues);
}
