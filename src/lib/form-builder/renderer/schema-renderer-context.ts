import { getContext, setContext } from "svelte";
import {
	resolveSchemaRendererI18nContext,
	type SchemaRendererI18nContext,
	type TranslatableLocaleMode,
} from "./schema-renderer-i18n";

const SCHEMA_RENDERER_CONTEXT = Symbol("schema-renderer");

/** What nested field lists (repeater items) need from the enclosing SchemaRenderer. */
export interface SchemaRendererContext {
	readonly i18n: SchemaRendererI18nContext;
	readonly translatableLocaleMode: TranslatableLocaleMode;
}

/** Pass an object with getters so readers always see the renderer's current locale. */
export function setSchemaRendererContext(context: SchemaRendererContext): void {
	setContext(SCHEMA_RENDERER_CONTEXT, context);
}

export function getSchemaRendererContext(): SchemaRendererContext {
	return (
		getContext<SchemaRendererContext | undefined>(SCHEMA_RENDERER_CONTEXT) ?? {
			i18n: resolveSchemaRendererI18nContext({}),
			translatableLocaleMode: "all",
		}
	);
}
