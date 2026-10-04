import { getContext, setContext } from "svelte";
import {
	resolveSchemaRendererI18nContext,
	type SchemaRendererI18nContext,
	type TranslatableLocaleMode,
} from "./schema-renderer-i18n";

const SCHEMA_RENDERER_CONTEXT = Symbol("schema-renderer");

export interface FieldFocusRequest {
	/** Field names and repeater item ids from the schema root. */
	path: string[];
}

/** Which validation errors the fields show, and where to send the editor's attention. */
export interface SchemaRendererValidation {
	/** The error to show for one field (path from the schema root) in one locale, if any. */
	errorFor(path: string[], locale: string): string | undefined;
	/** How many shown errors sit at or below a path (e.g. inside one repeater item). */
	errorCountWithin(path: string[]): number;
	/** Records an edit, so the field's error shows from now on. */
	markTouched(path: string[], locale: string): void;
	/** True once every error should show (after a blocked commit or save). */
	readonly showAll: boolean;
	/** A field to bring into view, e.g. from a link on the Changes page. A new object per request. */
	readonly focusRequest: FieldFocusRequest | null;
}

/** What nested field lists (repeater items) need from the enclosing SchemaRenderer. */
export interface SchemaRendererContext {
	readonly i18n: SchemaRendererI18nContext;
	readonly translatableLocaleMode: TranslatableLocaleMode;
	readonly validation: SchemaRendererValidation;
}

const NO_VALIDATION: SchemaRendererValidation = {
	errorFor: () => undefined,
	errorCountWithin: () => 0,
	markTouched: () => {},
	showAll: false,
	focusRequest: null,
};

/** Pass an object with getters so readers always see the renderer's current locale. */
export function setSchemaRendererContext(context: SchemaRendererContext): void {
	setContext(SCHEMA_RENDERER_CONTEXT, context);
}

export function getSchemaRendererContext(): SchemaRendererContext {
	return (
		getContext<SchemaRendererContext | undefined>(SCHEMA_RENDERER_CONTEXT) ?? {
			i18n: resolveSchemaRendererI18nContext({}),
			translatableLocaleMode: "all",
			validation: NO_VALIDATION,
		}
	);
}

/** True when `path` starts with every segment of `prefix`. */
export function pathStartsWith(path: string[], prefix: string[]): boolean {
	return prefix.length <= path.length && prefix.every((segment, index) => path[index] === segment);
}
