import { capsuloFetch, jsonBody } from "$lib/api/capsulo-client";
import {
	deserializePageEditorValues,
	serializePageEditorValues,
	type PageEditorValuesByInstance
} from "$lib/PageEditor/persistence";

export type LoadPageEditorDocumentResult = {
	valuesByInstance: PageEditorValuesByInstance;
	hasExistingDocument: boolean;
	updatedAt: string | null;
	errorMessage: string | null;
};

export type LoadPageEditorDocumentMetadataResult = {
	updatedAt: string | null;
	hasExistingDocument: boolean;
	errorMessage: string | null;
};

type PageResponse = { page: { content?: unknown; updatedAt: string } | null };

function pagePath(pageId: string): string {
	return `/pages/${pageId.split("/").map(encodeURIComponent).join("/")}`;
}

export async function loadPageEditorDocumentFromDb(
	pageId: string
): Promise<LoadPageEditorDocumentResult> {
	const { data, error } = await capsuloFetch<PageResponse>(pagePath(pageId));

	if (error !== null) {
		return { valuesByInstance: {}, hasExistingDocument: false, updatedAt: null, errorMessage: error };
	}

	if (!data.page?.content) {
		return {
			valuesByInstance: {},
			hasExistingDocument: false,
			updatedAt: data.page?.updatedAt ?? null,
			errorMessage: null
		};
	}

	return {
		valuesByInstance: deserializePageEditorValues(data.page.content),
		hasExistingDocument: true,
		updatedAt: data.page.updatedAt,
		errorMessage: null
	};
}

export async function loadPageEditorDocumentMetadataFromDb(
	pageId: string
): Promise<LoadPageEditorDocumentMetadataResult> {
	const { data, error } = await capsuloFetch<PageResponse>(`${pagePath(pageId)}?meta=1`);

	if (error !== null) return { updatedAt: null, hasExistingDocument: false, errorMessage: error };

	return {
		updatedAt: data.page?.updatedAt ?? null,
		hasExistingDocument: data.page !== null,
		errorMessage: null
	};
}

/** Message recorded when a revision is written outside the Changes page. */
const DEFAULT_COMMIT_MESSAGE = "Saved from editor";

export type CommitPageEditorDocumentsResult = {
	commitId: string | null;
	updatedAt: string | null;
	/** False when the site has no Deploy Hook, so it won't rebuild by itself. */
	rebuildRequested: boolean;
	errorMessage: string | null;
};

/**
 * Commits several pages under one message in a single atomic write: the commit, the
 * current documents and one history revision per page either all land or none do.
 */
export async function commitPageEditorDocuments(
	message: string,
	pages: { pageId: string; valuesByInstance: PageEditorValuesByInstance }[]
): Promise<CommitPageEditorDocumentsResult> {
	const { data, error } = await capsuloFetch<{ commitId: string; updatedAt: string; rebuildRequested: boolean }>(
		"/commits",
		{
			method: "POST",
			body: jsonBody({
				message: message.trim() || DEFAULT_COMMIT_MESSAGE,
				pages: pages.map((page) => ({
					pageId: page.pageId,
					content: serializePageEditorValues(page.valuesByInstance)
				}))
			})
		}
	);

	if (error !== null) return { commitId: null, updatedAt: null, rebuildRequested: false, errorMessage: error };
	return {
		commitId: data.commitId,
		updatedAt: data.updatedAt,
		rebuildRequested: data.rebuildRequested,
		errorMessage: null
	};
}

export type SavePageEditorDocumentInput = {
	pageId: string;
	/** Kept for call-site compatibility; the server records the signed-in user. */
	userId: string;
	valuesByInstance: PageEditorValuesByInstance;
	hasExistingDocument: boolean;
	/** Commit message recorded on the revision. */
	comment?: string;
};

export type SavePageEditorDocumentResult = {
	errorMessage: string | null;
	updatedAt: string | null;
};

/** Saves one page as its own single-page commit. */
export async function savePageEditorDocumentToDb(
	input: SavePageEditorDocumentInput
): Promise<SavePageEditorDocumentResult> {
	const result = await commitPageEditorDocuments(input.comment ?? DEFAULT_COMMIT_MESSAGE, [
		{ pageId: input.pageId, valuesByInstance: input.valuesByInstance }
	]);
	return { errorMessage: result.errorMessage, updatedAt: result.updatedAt };
}
