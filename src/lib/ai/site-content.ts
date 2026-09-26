import capsuleManifest from "virtual:capsule-manifest";
import { globalsSchema } from "$/config/globals/globals.schema";
import { getCapsuleByKey } from "$lib/capsules/core/registry";
import type { RegisteredCapsule } from "$lib/capsules/core/types";
import { DEFAULT_LOCALE, LOCALES } from "$lib/config/i18n-config";
import type { FieldDefinition, SchemaDefinition, SchemaValues, SelectFieldDefinition } from "$lib/form-builder/core/types";
import { getAllOptions, resolveSelectData } from "$lib/form-builder/fields/SelectField/modules/resolve-options";
import { createSchemaInitialValues } from "$lib/form-builder/renderer/schema-renderer-i18n";
import { ensureGlobalsLoaded } from "$lib/globals/globals-store.svelte";
import { loadGlobalsDraft } from "$lib/globals/globals-draft";
import { pageDisplayName } from "$lib/PageEditor/changes/changed-pages";
import { readPageDraft } from "$lib/PageEditor/changes/draft-write";
import { capsuleKeyFromInstanceId } from "$lib/PageEditor/changes/schema-defaults";
import { buildCapsuleInstanceData } from "$lib/PageEditor/ContentSidebar/capsule-instances";
import { groupManifestEntries } from "$lib/PageEditor/ContentSidebar/group-entries";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

/** Pseudo target id for the global variables in tool calls and edit records. */
export const GLOBALS_TARGET = "globals";

export type SiteInstance = { instanceId: string; capsule: RegisteredCapsule | undefined };
export type SitePage = { pageId: string; name: string; instances: SiteInstance[] };

export function pageLabel(pageId: string): string {
	return pageId === "index" ? "Home" : pageDisplayName(pageId);
}

/** Every page with its capsule instances, in the order the Page Editor shows them. */
export function listSitePages(): SitePage[] {
	return Object.entries(capsuleManifest)
		.sort(([a], [b]) => (a === "index" ? -1 : b === "index" ? 1 : a.localeCompare(b)))
		.map(([pageId, entries]) => ({
			pageId,
			name: pageLabel(pageId),
			instances: groupManifestEntries(entries).flatMap((group) =>
				buildCapsuleInstanceData(group).instanceIds.map((instanceId) => ({
					instanceId,
					capsule: getCapsuleByKey(group.capsuleKey)
				}))
			)
		}));
}

export function findSitePage(pageId: string): SitePage | undefined {
	return listSitePages().find((page) => page.pageId === pageId);
}

export function schemaForInstance(instanceId: string): SchemaDefinition | undefined {
	if (instanceId === GLOBALS_TARGET) return globalsSchema;
	return getCapsuleByKey(capsuleKeyFromInstanceId(instanceId))?.schema;
}

export function findField(schema: SchemaDefinition | undefined, fieldName: string): FieldDefinition | undefined {
	return schema?.fields.find((field) => field.name === fieldName);
}

/** Fields whose value differs per locale. Toggles are never translated (the editor shows one). */
export function isTranslatable(field: FieldDefinition): boolean {
	return Boolean(field.translatable) && field.type !== "toggle";
}

export function selectOptionValues(field: SelectFieldDefinition, locale: string): string[] {
	return getAllOptions(resolveSelectData(field, locale)).map((option) => option.value);
}

/** Stored values with the schema defaults filled in, as the editor shows them. */
function withDefaults(schema: SchemaDefinition, values: SchemaValues | undefined): SchemaValues {
	const defaults = createSchemaInitialValues(schema, DEFAULT_LOCALE);
	const merged: SchemaValues = {};
	for (const field of schema.fields) {
		merged[field.name] = { ...defaults[field.name], ...values?.[field.name] };
	}
	return merged;
}

/** The page's draft (or committed content when it has no draft) with defaults for unset fields. */
export async function readPageValues(
	page: SitePage
): Promise<{ values: PageEditorValuesByInstance; errorMessage: string | null }> {
	const { valuesByInstance, errorMessage } = await readPageDraft(page.pageId);
	if (errorMessage) return { values: {}, errorMessage };
	const values: PageEditorValuesByInstance = {};
	for (const instance of page.instances) {
		if (!instance.capsule) continue;
		values[instance.instanceId] = withDefaults(instance.capsule.schema, valuesByInstance[instance.instanceId]);
	}
	return { values, errorMessage: null };
}

/** Unsaved global variables if there are any, else the saved ones. */
export async function readGlobalsValues(): Promise<SchemaValues> {
	const draft = await loadGlobalsDraft();
	const values = draft?.values ?? (await ensureGlobalsLoaded());
	return withDefaults(globalsSchema, values);
}

/** How a field's value is presented to the model: one value, or one per locale. */
function presentFieldValue(field: FieldDefinition, value: SchemaValues[string] | undefined): unknown {
	if (!isTranslatable(field)) return value?.[DEFAULT_LOCALE] ?? null;
	const perLocale: Record<string, unknown> = {};
	for (const locale of LOCALES) perLocale[locale] = value?.[locale] ?? null;
	return perLocale;
}

export function presentInstanceValues(schema: SchemaDefinition, values: SchemaValues): Record<string, unknown> {
	const presented: Record<string, unknown> = {};
	for (const field of schema.fields) presented[field.name] = presentFieldValue(field, values[field.name]);
	return presented;
}

const MAX_OPTIONS_IN_CONTEXT = 25;

function describeField(field: FieldDefinition): string {
	const parts: string[] = [field.type];
	if (isTranslatable(field)) parts.push("translatable");
	if (field.required) parts.push("required");
	if (field.type === "textarea" && field.maxLength) parts.push(`max ${field.maxLength} chars`);
	if (field.type === "select") {
		if (field.multiple) parts.push("multiple");
		if (field.internalLinks) {
			parts.push("links to site pages");
		} else {
			const options = getAllOptions(resolveSelectData(field, DEFAULT_LOCALE));
			const shown = options.slice(0, MAX_OPTIONS_IN_CONTEXT).map((option) => `${option.value} (${option.label})`);
			if (options.length > shown.length) shown.push(`… ${options.length - shown.length} more`);
			parts.push(`options: ${shown.join(", ")}`);
		}
	}
	if (field.type === "colorpicker" && field.onlyPresets && field.presetColors?.length) {
		parts.push(`only: ${field.presetColors.join(", ")}`);
	}
	if (field.type === "file-upload") parts.push("read-only for you");

	const label = field.label && field.label !== field.name ? ` "${field.label}"` : "";
	const description = field.description ? ` - ${field.description}` : "";
	return `- ${field.name}${label}: ${parts.join(", ")}${description}`;
}

function describeSchema(schema: SchemaDefinition): string {
	return schema.fields.map(describeField).join("\n");
}

export type AgentLocation = { kind: "page"; pageId: string } | { kind: "globals" } | { kind: "other"; path: string };

/** Where the editor is, from the admin URL. */
export function currentAgentLocation(pathname: string): AgentLocation {
	const pagePrefix = "/admin/page-editor/";
	if (pathname.startsWith(pagePrefix)) {
		const pageId = pathname.slice(pagePrefix.length).split("/").map(decodeURIComponent).join("/").replace(/\/$/, "");
		if (pageId && pageId in capsuleManifest) return { kind: "page", pageId };
	}
	if (pathname.startsWith("/admin/globals")) return { kind: "globals" };
	return { kind: "other", path: pathname };
}

/**
 * The site overview sent with every request: locales, pages with their capsule
 * instances and each capsule's fields. Values are not included; the model reads them
 * with the tools, so a question about one page doesn't pay for the whole site.
 */
export function buildSiteContext(location: AgentLocation): string {
	const pages = listSitePages();
	const capsules = new Map<string, RegisteredCapsule>();
	for (const page of pages) {
		for (const instance of page.instances) if (instance.capsule) capsules.set(instance.capsule.key, instance.capsule);
	}

	const where =
		location.kind === "page"
			? `The user is editing the page "${location.pageId}" (${pageLabel(location.pageId)}). "This page" means it.`
			: location.kind === "globals"
				? "The user is on the Global Variables page."
				: `The user is on the admin page ${location.path}.`;

	const pageLines = pages.map((page) => {
		const instances = page.instances
			.map((instance) => `${instance.instanceId} (${instance.capsule?.meta?.displayName ?? instance.capsule?.schema.name ?? "unknown capsule"})`)
			.join(", ");
		return `- ${page.pageId} "${page.name}": ${instances || "no capsules"}`;
	});

	const capsuleSections = [...capsules.values()].map((capsule) => {
		const description = capsule.meta?.description ?? capsule.schema.description;
		return `## ${capsule.key} "${capsule.meta?.displayName ?? capsule.schema.name}"${description ? ` - ${description}` : ""}\n${describeSchema(capsule.schema)}`;
	});

	return [
		"# Site",
		`Locales: ${LOCALES.map((locale) => (locale === DEFAULT_LOCALE ? `${locale} (default)` : locale)).join(", ")}`,
		where,
		"",
		"# Pages (page id, name: capsule instances)",
		...pageLines,
		"",
		"# Capsule fields (instance ids are the capsule key plus a number)",
		...capsuleSections,
		"",
		`# Global variables (target "${GLOBALS_TARGET}")`,
		describeSchema(globalsSchema)
	].join("\n");
}
