import { capsuloFetch, jsonBody } from "$lib/api/capsulo-client";
import type { SchemaValues } from "$lib/form-builder/core/types";

import { deserializeGlobalsValues, serializeGlobalsValues } from "./globals-persistence";

export type LoadGlobalsDocumentResult = {
	values: SchemaValues;
	hasExistingDocument: boolean;
	updatedAt: string | null;
	errorMessage: string | null;
};

export type SaveGlobalsDocumentInput = {
	/** Kept for call-site compatibility; the server records the signed-in user. */
	userId: string;
	values: SchemaValues;
	hasExistingDocument: boolean;
};

export type SaveGlobalsDocumentResult = {
	errorMessage: string | null;
	updatedAt: string | null;
};

export async function loadGlobalsDocumentFromDb(): Promise<LoadGlobalsDocumentResult> {
	const { data, error } = await capsuloFetch<{ globals: { content: unknown; updatedAt: string } | null }>(
		"/globals"
	);

	if (error !== null) return { values: {}, hasExistingDocument: false, updatedAt: null, errorMessage: error };

	if (!data.globals?.content) {
		return { values: {}, hasExistingDocument: false, updatedAt: null, errorMessage: null };
	}

	return {
		values: deserializeGlobalsValues(data.globals.content),
		hasExistingDocument: true,
		updatedAt: data.globals.updatedAt,
		errorMessage: null
	};
}

export async function saveGlobalsDocumentToDb(
	input: SaveGlobalsDocumentInput
): Promise<SaveGlobalsDocumentResult> {
	const { data, error } = await capsuloFetch<{ updatedAt: string }>("/globals", {
		method: "PUT",
		body: jsonBody({ content: serializeGlobalsValues(input.values) })
	});

	if (error !== null) return { errorMessage: error, updatedAt: null };
	return { errorMessage: null, updatedAt: data.updatedAt };
}
