import { supabase } from "$/db/supabase";
import {
	PAGE_EDITOR_CONTENT_FORMAT_VERSION,
	deserializePageEditorValues,
	serializePageEditorValues,
	type PageEditorValuesByInstance
} from "$lib/PageEditor/persistence";

export type LoadPageEditorDocumentResult = {
	valuesByInstance: PageEditorValuesByInstance;
	hasExistingDocument: boolean;
	errorMessage: string | null;
};

export async function loadPageEditorDocumentFromDb(
	pageId: string
): Promise<LoadPageEditorDocumentResult> {
	const { data, error } = await supabase
		.from("pages")
		.select("content")
		.eq("page_id", pageId)
		.maybeSingle();

	if (error) {
		return {
			valuesByInstance: {},
			hasExistingDocument: false,
			errorMessage: error.message
		};
	}

	if (!data?.content) {
		return {
			valuesByInstance: {},
			hasExistingDocument: false,
			errorMessage: null
		};
	}

	return {
		valuesByInstance: deserializePageEditorValues(data.content),
		hasExistingDocument: true,
		errorMessage: null
	};
}

export type SavePageEditorDocumentInput = {
	pageId: string;
	userId: string;
	valuesByInstance: PageEditorValuesByInstance;
	hasExistingDocument: boolean;
};

export type SavePageEditorDocumentResult = {
	errorMessage: string | null;
};

export async function savePageEditorDocumentToDb(
	input: SavePageEditorDocumentInput
): Promise<SavePageEditorDocumentResult> {
	const serializedContent = serializePageEditorValues(input.valuesByInstance);
	const documentPayload: {
		page_id: string;
		content: ReturnType<typeof serializePageEditorValues>;
		content_format_version: number;
		updated_by: string;
		created_by?: string;
	} = {
		page_id: input.pageId,
		content: serializedContent,
		content_format_version: PAGE_EDITOR_CONTENT_FORMAT_VERSION,
		updated_by: input.userId
	};

	if (!input.hasExistingDocument) {
		documentPayload.created_by = input.userId;
	}

	const { error: upsertError } = await supabase
		.from("pages")
		.upsert(documentPayload, { onConflict: "page_id" });

	if (upsertError) {
		return { errorMessage: upsertError.message };
	}

	const { error: revisionError } = await supabase.from("pages-history").insert({
		page_id: input.pageId,
		content: serializedContent,
		content_format_version: PAGE_EDITOR_CONTENT_FORMAT_VERSION,
		created_by: input.userId
	});

	if (revisionError) {
		return { errorMessage: revisionError.message };
	}

	return { errorMessage: null };
}
