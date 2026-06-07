import { globalsSchema } from "$/config/globals/globals.schema";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import type { SchemaValues } from "$lib/form-builder/core/types";

import { ensureGlobalsLoaded } from "./globals-store.svelte";
import { resolveGlobalsValues } from "./resolve-globals";
import type { GetGlobalsOptions, GlobalsResolvedMap } from "./types";

export function getGlobalsKnownKeys(): ReadonlySet<string> {
	return new Set(globalsSchema.fields.map((field) => field.name));
}

export async function getGlobals(): Promise<GlobalsResolvedMap>;
export async function getGlobals(options: GetGlobalsOptions & { key: string }): Promise<unknown>;
export async function getGlobals(
	options?: GetGlobalsOptions
): Promise<GlobalsResolvedMap | unknown> {
	const locale = options?.locale ?? DEFAULT_LOCALE;
	const defaultLocale = DEFAULT_LOCALE;
	const rawValues: SchemaValues = options?.values ?? (await ensureGlobalsLoaded());
	const resolved = resolveGlobalsValues(rawValues, locale, defaultLocale);

	if (options?.key) return resolved[options.key];

	return resolved;
}
