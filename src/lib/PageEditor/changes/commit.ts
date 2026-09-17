import { get } from "svelte/store";
import { session, syncSession } from "$lib/stores/session";
import {
	loadAllPageEditorCacheDocuments,
	savePageEditorDocumentToCache
} from "$lib/PageEditor/page-editor-cache";
import {
	loadPageEditorDocumentMetadataFromDb,
	savePageEditorDocumentToDb
} from "$lib/PageEditor/page-editor-documents";
import { selectCommittableDocuments } from "./commit-selection";

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
 * Each page that actually changed is written to `pages` (+ a `pages-history`
 * revision carrying the commit message); its committed values then become the
 * new local baseline so it drops out of the Changes list. Per-page failures are
 * collected so a partial failure does not lose the message or the pages that
 * did commit.
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
	const committable = selectCommittableDocuments(documents, pageIds);
	const committedPageIds: string[] = [];
	const failures: CommitFailure[] = [];

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
			comment: message
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
