import { capsuloFetch, jsonBody } from "../api/capsulo-client";
import {
	deserializePageEditorValues,
	serializePageEditorValues,
	type PageEditorValuesByInstance
} from "./persistence";
import { t } from "../admin-i18n/i18n.svelte";
import { GLOBALS_INSTANCE_ID } from "../capsules/core/validate-content";
import type { SchemaValues } from "../form-builder/core/types";
import { loadGlobalsDocumentFromDb } from "../globals/globals-documents";
import {
	deserializeGlobalsValues,
	GLOBALS_DOCUMENT_ID,
	serializeGlobalsValues
} from "../globals/globals-persistence";

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

/** The global variables as a one-instance page, the shape their draft has in the page cache. */
export function wrapGlobalsValues(values: SchemaValues): PageEditorValuesByInstance {
	return { [GLOBALS_INSTANCE_ID]: values };
}

/** A stored page or globals document (as History returns it) in the editor's shape. */
export function deserializeDocumentContent(pageId: string, content: unknown): PageEditorValuesByInstance {
	return pageId === GLOBALS_DOCUMENT_ID
		? wrapGlobalsValues(deserializeGlobalsValues(content))
		: deserializePageEditorValues(content);
}

async function loadGlobalsAsPageDocument(): Promise<LoadPageEditorDocumentResult> {
	const result = await loadGlobalsDocumentFromDb();
	return { ...result, valuesByInstance: wrapGlobalsValues(result.values) };
}

/** The committed document for a page, or for the global variables under `GLOBALS_DOCUMENT_ID`. */
export async function loadPageEditorDocumentFromDb(
	pageId: string
): Promise<LoadPageEditorDocumentResult> {
	if (pageId === GLOBALS_DOCUMENT_ID) return loadGlobalsAsPageDocument();
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
function defaultCommitMessage(): string {
	return t("commit.defaultMessage");
}

export type CommitPageEditorDocumentsResult = {
	commitId: string | null;
	updatedAt: string | null;
	/** False when the site has no Deploy Hook, so it won't rebuild by itself. */
	rebuildRequested: boolean;
	errorMessage: string | null;
};

/**
 * Commits several pages (and the global variables, when given under `GLOBALS_DOCUMENT_ID`)
 * under one message in a single atomic write: the commit, the current documents and one
 * history revision each either all land or none do.
 */
export async function commitPageEditorDocuments(
	message: string,
	documents: { pageId: string; valuesByInstance: PageEditorValuesByInstance }[]
): Promise<CommitPageEditorDocumentsResult> {
	const globals = documents.find((document) => document.pageId === GLOBALS_DOCUMENT_ID);
	const pages = documents.filter((document) => document !== globals);
	const { data, error } = await capsuloFetch<{ commitId: string; updatedAt: string; rebuildRequested: boolean }>(
		"/commits",
		{
			method: "POST",
			body: jsonBody({
				message: message.trim() || defaultCommitMessage(),
				pages: pages.map((page) => ({
					pageId: page.pageId,
					content: serializePageEditorValues(page.valuesByInstance)
				})),
				globals: globals ? serializeGlobalsValues(globals.valuesByInstance[GLOBALS_INSTANCE_ID] ?? {}) : undefined
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
	const result = await commitPageEditorDocuments(input.comment ?? defaultCommitMessage(), [
		{ pageId: input.pageId, valuesByInstance: input.valuesByInstance }
	]);
	return { errorMessage: result.errorMessage, updatedAt: result.updatedAt };
}
