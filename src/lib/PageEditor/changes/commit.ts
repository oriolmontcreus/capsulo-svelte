import { get } from "svelte/store";
import { session, syncSession } from "$lib/stores/session";
import {
	loadAllPageEditorCacheDocuments,
	savePageEditorDocumentToCache
} from "$lib/PageEditor/page-editor-cache";
import {
	createCommit,
	loadPageEditorDocumentMetadataFromDb,
	savePageEditorDocumentToDb
} from "$lib/PageEditor/page-editor-documents";
import { selectCommittableDocuments } from "./commit-selection";
import { resolveInstanceDefaults } from "./schema-defaults";

export type CommitFailure = {
	pageId: string;
	message: string;
};

export type CommitResult = {
	committedPageIds: string[];
	failures: CommitFailure[];
	/** Top-level error that aborted the whole commit (e.g. not authenticated). */
	errorMessage: string | null;
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
 * Commits the local draft of each given page to Supabase under a single message.
 * One `commits` row groups every page written by this action, so the History page
 * shows "this commit touched pages A, B and C" as a single entry. Each page that
 * actually changed is written to `pages` (+ a `pages-history` revision linked to
 * that commit); its committed values then become the new local baseline so it
 * drops out of the Changes list. Per-page failures are collected so a partial
 * failure does not lose the message or the pages that did commit.
 *
 * ponytail: file-upload staging is intentionally NOT flushed here (deferred to a
 * later phase). The editor is unmounted on this route, so staged uploads would
 * be a no-op anyway; this commit only persists what is already in the draft cache.
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
			errorMessage: "You must be signed in to commit changes."
		};
	}

	const documents = await loadAllPageEditorCacheDocuments();
	// Guard against empty/duplicate revisions: only pages that really changed.
	const committable = selectCommittableDocuments(documents, pageIds, resolveInstanceDefaults);
	const committedPageIds: string[] = [];
	const failures: CommitFailure[] = [];

	if (committable.length === 0) {
		return { committedPageIds, failures, errorMessage: null };
	}

	// One commit row for the whole action; every revision below links to it.
	const createdCommit = await createCommit(message.trim(), userId);
	if (createdCommit.errorMessage || !createdCommit.commitId) {
		return {
			committedPageIds,
			failures,
			errorMessage: createdCommit.errorMessage ?? "Failed to create the commit."
		};
	}
	const commitId = createdCommit.commitId;

	for (const document of committable) {
		const pageId = document.pageId;
		const metadata = await loadPageEditorDocumentMetadataFromDb(pageId);
		if (metadata.errorMessage) {
			failures.push({ pageId, message: metadata.errorMessage });
			continue;
		}

		const draftValues = document.valuesByInstance;
		const saveResult = await savePageEditorDocumentToDb({
			pageId,
			userId,
			valuesByInstance: draftValues,
			hasExistingDocument: metadata.hasExistingDocument,
			comment: message,
			commitId
		});

		if (saveResult.errorMessage) {
			failures.push({ pageId, message: saveResult.errorMessage });
			continue;
		}

		// The committed values are now the truth: reset the baseline so the page
		// no longer reports local changes.
		await savePageEditorDocumentToCache({
			pageId,
			valuesByInstance: draftValues,
			baselineValuesByInstance: draftValues,
			updatedAt: saveResult.updatedAt
		});
		committedPageIds.push(pageId);
	}

	return { committedPageIds, failures, errorMessage: null };
}
