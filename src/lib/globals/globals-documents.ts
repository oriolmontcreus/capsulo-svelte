import { supabase } from "$/db/supabase";
import type { SchemaValues } from "$lib/form-builder/core/types";

import {
	GLOBALS_CONTENT_FORMAT_VERSION,
	GLOBALS_DOCUMENT_ID,
	deserializeGlobalsValues,
	serializeGlobalsValues
} from "./globals-persistence";

export type LoadGlobalsDocumentResult = {
	values: SchemaValues;
	hasExistingDocument: boolean;
	updatedAt: string | null;
	errorMessage: string | null;
};

export type SaveGlobalsDocumentInput = {
	userId: string;
	values: SchemaValues;
	hasExistingDocument: boolean;
};

export type SaveGlobalsDocumentResult = {
	errorMessage: string | null;
	updatedAt: string | null;
};

export async function loadGlobalsDocumentFromDb(): Promise<LoadGlobalsDocumentResult> {
	const { data, error } = await supabase
		.from("globals")
		.select("content, updated_at")
		.eq("id", GLOBALS_DOCUMENT_ID)
		.maybeSingle();

	if (error) {
		return {
			values: {},
			hasExistingDocument: false,
			updatedAt: null,
			errorMessage: error.message
		};
	}

	if (!data?.content) {
		return {
			values: {},
			hasExistingDocument: false,
			updatedAt: data?.updated_at ?? null,
			errorMessage: null
		};
	}

	return {
		values: deserializeGlobalsValues(data.content),
		hasExistingDocument: true,
		updatedAt: data.updated_at ?? null,
		errorMessage: null
	};
}

export async function saveGlobalsDocumentToDb(
	input: SaveGlobalsDocumentInput
): Promise<SaveGlobalsDocumentResult> {
	const serializedContent = serializeGlobalsValues(input.values);
	const documentPayload: {
		id: string;
		content: ReturnType<typeof serializeGlobalsValues>;
		content_format_version: number;
		updated_by: string;
		created_by?: string;
	} = {
		id: GLOBALS_DOCUMENT_ID,
		content: serializedContent,
		content_format_version: GLOBALS_CONTENT_FORMAT_VERSION,
		updated_by: input.userId
	};

	if (!input.hasExistingDocument) documentPayload.created_by = input.userId;

	const { data: upsertedDocument, error: upsertError } = await supabase
		.from("globals")
		.upsert(documentPayload, { onConflict: "id" })
		.select("updated_at")
		.single();

	if (upsertError) return { errorMessage: upsertError.message, updatedAt: null };

	return { errorMessage: null, updatedAt: upsertedDocument?.updated_at ?? null };
}
