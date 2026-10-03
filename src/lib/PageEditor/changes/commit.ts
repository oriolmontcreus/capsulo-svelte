import { get } from "svelte/store";
import { session, syncSession } from "$lib/stores/session";
import {
	loadAllPageEditorCacheDocuments,
	savePageEditorDocumentToCache
} from "$lib/PageEditor/page-editor-cache";
import { commitPageEditorDocuments } from "$lib/PageEditor/page-editor-documents";
import { validatePageValues } from "$lib/PageEditor/validate-documents";
import { selectCommittableDocuments } from "./commit-selection";
import { resolveInstanceDefaults } from "./schema-defaults";
import { t } from "$lib/admin-i18n/i18n.svelte";

export type CommitFailure = {
	pageId: string;
	message: string;
};

export type CommitResult = {
	committedPageIds: string[];
	failures: CommitFailure[];
	/** Top-level error that aborted the whole commit (e.g. not authenticated). */
	errorMessage: string | null;
	/** Shown after a successful commit: when the live site will reflect it. */
	publishNotice: string | null;
};

async function resolveUserId(): Promise<string | null> {
	let userId = get(session)?.user?.id ?? null;
	if (!userId) {
		await syncSession();
		userId = get(session)?.user?.id ?? null;
	}
	return userId;
}

/**
 * Commits the local draft of each given page under a single message. The API writes
 * the commit row, every page and one history revision per page atomically, then asks
 * Workers Builds to rebuild the static site. Committed values become the new local
 * baseline so the pages drop out of the Changes list.
 *
 * File-upload fields need nothing special here: files are uploaded when picked and
 * the draft already holds their keys.
 */
export async function commitChanges(
	message: string,
	pageIds: string[]
): Promise<CommitResult> {
	const userId = await resolveUserId();
	if (!userId) {
		return {
			committedPageIds: [],
			failures: [],
			errorMessage: t("commit.signInRequired"),
			publishNotice: null
		};
	}

	const documents = await loadAllPageEditorCacheDocuments();
	// Guard against empty/duplicate revisions: only pages that really changed.
	const committable = selectCommittableDocuments(documents, pageIds, resolveInstanceDefaults);
	if (committable.length === 0) {
		return { committedPageIds: [], failures: [], errorMessage: null, publishNotice: null };
	}

	// The Changes page already blocks this; checked again so no caller can skip it. The API
	// runs the same validation and rejects invalid pages too.
	const issueCount = committable.reduce(
		(count, document) => count + validatePageValues(document.pageId, document.valuesByInstance).length,
		0
	);
	if (issueCount > 0) {
		return {
			committedPageIds: [],
			failures: [],
			errorMessage: t("commit.fieldsNeedFixing", { count: issueCount }),
			publishNotice: null
		};
	}

	const result = await commitPageEditorDocuments(
		message,
		committable.map((document) => ({
			pageId: document.pageId,
			valuesByInstance: document.valuesByInstance
		}))
	);
	if (result.errorMessage) {
		return { committedPageIds: [], failures: [], errorMessage: result.errorMessage, publishNotice: null };
	}

	// The committed values are now the truth: reset the baseline so the pages no
	// longer report local changes.
	for (const document of committable) {
		await savePageEditorDocumentToCache({
			pageId: document.pageId,
			valuesByInstance: document.valuesByInstance,
			baselineValuesByInstance: document.valuesByInstance,
			updatedAt: result.updatedAt
		});
	}

	return {
		committedPageIds: committable.map((document) => document.pageId),
		failures: [],
		errorMessage: null,
		publishNotice: t(result.rebuildRequested ? "commit.rebuildNotice" : "commit.noRebuildNotice")
	};
}
