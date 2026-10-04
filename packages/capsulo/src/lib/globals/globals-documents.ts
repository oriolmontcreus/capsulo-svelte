import { capsuloFetch } from "../api/capsulo-client";
import type { SchemaValues } from "../form-builder/core/types";

import { deserializeGlobalsValues } from "./globals-persistence";

export type LoadGlobalsDocumentResult = {
	values: SchemaValues;
	hasExistingDocument: boolean;
	updatedAt: string | null;
	errorMessage: string | null;
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
