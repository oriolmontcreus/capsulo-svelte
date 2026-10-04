import capsuleManifest from "virtual:capsule-manifest";
import { globalsSchema } from "virtual:capsulo/globals-schema";
import { listPageInstances } from "../capsules/core/page-instances";
import { getCapsuleSchemaByKey } from "../capsules/core/schema-registry";
import {
	formatContentIssue,
	validateGlobalsContent,
	validatePageContent,
	type ContentIssue
} from "../capsules/core/validate-content";
import { t, withUiLocale, type UiLocale } from "../admin-i18n/core";
import { DEFAULT_LOCALE, LOCALES } from "../config/i18n-config";
import { deserializeGlobalsValues } from "../globals/globals-persistence";
import { deserializePageEditorValues } from "../PageEditor/persistence";
import { HttpError } from "./http";

const OPTIONS = { defaultLocale: DEFAULT_LOCALE, locales: LOCALES };

export type PageContentIssue = ContentIssue & { pageId: string };

/** The same check the Changes page runs before it lets anyone commit. */
function findPageContentIssues(pageId: string, content: unknown): PageContentIssue[] {
	const instances = listPageInstances(capsuleManifest[pageId] ?? []);
	return validatePageContent(instances, deserializePageEditorValues(content), getCapsuleSchemaByKey, OPTIONS).map(
		(issue) => ({ ...issue, pageId })
	);
}

function rejectInvalid(issues: Array<ContentIssue & { pageId?: string }>): never {
	const listed = issues
		.slice(0, 5)
		.map((issue) => `${issue.pageId ? `${issue.pageId}: ` : ""}${formatContentIssue(issue, DEFAULT_LOCALE)}`)
		.join("; ");
	const summary = issues.length > 5 ? t("api.invalidContentMore", { summary: listed, count: issues.length - 5 }) : listed;
	throw new HttpError(422, t("api.invalidContent", { summary }), { issues });
}

/** Validation messages are in `uiLocale`, the admin language of the editor who sent the content. */
export function assertValidPages(pages: Array<{ pageId: string; content: unknown }>, uiLocale: UiLocale): void {
	withUiLocale(uiLocale, () => {
		const issues = pages.flatMap((page) => findPageContentIssues(page.pageId, page.content));
		if (issues.length > 0) rejectInvalid(issues);
	});
}

export function assertValidGlobals(content: unknown, uiLocale: UiLocale): void {
	withUiLocale(uiLocale, () => {
		const issues = validateGlobalsContent(globalsSchema, deserializeGlobalsValues(content), OPTIONS);
		if (issues.length > 0) rejectInvalid(issues);
	});
}
