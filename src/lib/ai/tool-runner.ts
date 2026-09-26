import { LOCALES } from "$lib/config/i18n-config";
import { globalsSchema } from "$/config/globals/globals.schema";
import { applyContentUpdate, type EditRecord, type RequestedChange } from "./edits";
import type { AiToolCall } from "./protocol";
import {
	GLOBALS_TARGET,
	findSitePage,
	listSitePages,
	pageLabel,
	presentInstanceValues,
	readGlobalsValues,
	readPageValues,
	type SitePage
} from "./site-content";
import { AI_TOOL_NAMES } from "./tools";

export type ToolOutcome = {
	/** JSON sent back to the model. */
	content: string;
	edit?: EditRecord;
};

const MAX_SEARCH_RESULTS = 30;
const SNIPPET_RADIUS = 60;

function parseArguments(call: AiToolCall): Record<string, unknown> {
	try {
		const parsed = JSON.parse(call.arguments || "{}") as unknown;
		return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : {};
	} catch {
		return {};
	}
}

/** Short progress label for the sidebar while a tool runs. */
export function describeToolCall(call: AiToolCall): string {
	const args = parseArguments(call);
	const target = typeof args.target === "string" ? args.target : typeof args.pageId === "string" ? args.pageId : "";
	const label = target === GLOBALS_TARGET ? "global variables" : target ? pageLabel(target) : "";
	switch (call.name) {
		case AI_TOOL_NAMES.getPage:
			return `Reading ${label || "a page"}`;
		case AI_TOOL_NAMES.getGlobals:
			return "Reading global variables";
		case AI_TOOL_NAMES.searchContent:
			return typeof args.query === "string" ? `Searching for “${args.query}”` : "Searching the site";
		case AI_TOOL_NAMES.updateContent:
			return `Editing ${label || "content"}`;
		default:
			return "Working";
	}
}

async function presentPage(page: SitePage): Promise<unknown> {
	const { values, errorMessage } = await readPageValues(page);
	if (errorMessage) return { error: errorMessage };
	const instances: Record<string, unknown> = {};
	for (const instance of page.instances) {
		if (!instance.capsule) continue;
		instances[instance.instanceId] = {
			capsule: instance.capsule.key,
			fields: presentInstanceValues(instance.capsule.schema, values[instance.instanceId] ?? {})
		};
	}
	return { pageId: page.pageId, name: page.name, instances };
}

function collectMatches(
	target: string,
	instanceId: string | undefined,
	fields: Record<string, unknown>,
	needle: string,
	results: unknown[]
): void {
	for (const [field, value] of Object.entries(fields)) {
		const perLocale =
			typeof value === "object" && value !== null && !Array.isArray(value)
				? Object.entries(value as Record<string, unknown>)
				: [[undefined, value] as const];
		for (const [locale, localeValue] of perLocale) {
			const text = Array.isArray(localeValue) ? localeValue.join(", ") : typeof localeValue === "string" ? localeValue : "";
			const index = text.toLowerCase().indexOf(needle);
			if (index === -1) continue;
			if (results.length >= MAX_SEARCH_RESULTS) return;
			const start = Math.max(0, index - SNIPPET_RADIUS);
			const snippet = `${start > 0 ? "…" : ""}${text.slice(start, index + needle.length + SNIPPET_RADIUS)}${index + needle.length + SNIPPET_RADIUS < text.length ? "…" : ""}`;
			results.push({ target, ...(instanceId ? { instanceId } : {}), field, ...(locale ? { locale } : {}), snippet });
		}
	}
}

async function searchContent(query: string): Promise<unknown> {
	const needle = query.trim().toLowerCase();
	if (!needle) return { error: "Empty query." };
	const results: unknown[] = [];

	const globals = await readGlobalsValues();
	collectMatches(GLOBALS_TARGET, undefined, presentInstanceValues(globalsSchema, globals), needle, results);

	const pages = listSitePages();
	const loaded = await Promise.all(pages.map(async (page) => ({ page, ...(await readPageValues(page)) })));
	for (const { page, values } of loaded) {
		for (const instance of page.instances) {
			if (!instance.capsule || results.length >= MAX_SEARCH_RESULTS) continue;
			collectMatches(page.pageId, instance.instanceId, presentInstanceValues(instance.capsule.schema, values[instance.instanceId] ?? {}), needle, results);
		}
	}
	return { results, truncated: results.length >= MAX_SEARCH_RESULTS };
}

async function run(call: AiToolCall): Promise<{ result: unknown; edit?: EditRecord }> {
	const args = parseArguments(call);
	switch (call.name) {
		case AI_TOOL_NAMES.getPage: {
			const page = typeof args.pageId === "string" ? findSitePage(args.pageId) : undefined;
			if (!page) return { result: { error: `Unknown pageId ${JSON.stringify(args.pageId)}. Page ids: ${listSitePages().map((item) => item.pageId).join(", ")}.` } };
			return { result: await presentPage(page) };
		}
		case AI_TOOL_NAMES.getGlobals:
			return { result: { locales: LOCALES, values: presentInstanceValues(globalsSchema, await readGlobalsValues()) } };
		case AI_TOOL_NAMES.searchContent:
			return { result: await searchContent(typeof args.query === "string" ? args.query : "") };
		case AI_TOOL_NAMES.updateContent: {
			const target = typeof args.target === "string" ? args.target : "";
			const changes = Array.isArray(args.changes) ? (args.changes as RequestedChange[]) : [];
			const { edit, errors } = await applyContentUpdate(target, changes);
			const result = edit
				? {
						saved: `Changed ${edit.fields.length} value(s) in the ${target === GLOBALS_TARGET ? "global variables" : `page "${target}"`} draft.`,
						...(errors.length ? { notApplied: errors } : {})
					}
				: { error: "Nothing was changed.", details: errors };
			return { result, edit: edit ?? undefined };
		}
		default:
			return { result: { error: `Unknown tool "${call.name}".` } };
	}
}

export async function runToolCall(call: AiToolCall): Promise<ToolOutcome> {
	try {
		const { result, edit } = await run(call);
		return { content: JSON.stringify(result), edit };
	} catch (error) {
		return { content: JSON.stringify({ error: error instanceof Error ? error.message : "The tool failed." }) };
	}
}
