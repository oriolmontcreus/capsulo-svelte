import { LOCALES } from "$lib/config/i18n-config";
import { globalsSchema } from "$/config/globals/globals.schema";
import { applyContentUpdate, CONTROL_TOKEN_PATTERN, type EditRecord, type RequestedChange } from "./edits";
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
	/** update_content only: which requested fields were saved and which weren't. */
	update?: UpdateReport;
};

/**
 * Bookkeeping for one update_content call, keyed by `instanceId:field`, so the agent can
 * tell the user about a requested change that never got saved, whatever the model claims.
 */
export type UpdateReport = {
	saved: string[];
	/** `key` is "*" when the call couldn't be read at all. */
	failed: { key: string; message: string }[];
};

/** "Every value was already the same" is a no-op, not a failure. */
const NOTHING_TO_CHANGE = /^Every value was already the same/;

function reportUpdate(target: string, changes: RequestedChange[], errors: string[]): UpdateReport {
	const keyOf = (change: RequestedChange | undefined) =>
		`${target === GLOBALS_TARGET ? GLOBALS_TARGET : String(change?.instanceId)}:${String(change?.field)}`;
	const failedIndexes = new Set<number>();
	const failed: UpdateReport["failed"] = [];
	for (const message of errors) {
		const index = /^changes\[(\d+)\]/.exec(message)?.[1];
		if (index !== undefined) {
			failedIndexes.add(Number(index));
			failed.push({ key: keyOf(changes[Number(index)]), message });
		} else if (!NOTHING_TO_CHANGE.test(message)) {
			failed.push({ key: "*", message });
		}
	}
	const saved = failed.some((item) => item.key === "*")
		? []
		: changes.flatMap((change, index) => (failedIndexes.has(index) ? [] : [keyOf(change)]));
	return { saved, failed };
}

const MAX_SEARCH_RESULTS = 30;
const SNIPPET_RADIUS = 60;

type ParsedArguments = { args: Record<string, unknown> } | { error: string };

/** The keys each tool takes. A call with others is malformed (e.g. a change that leaked out of its object). */
const TOOL_ARGUMENT_KEYS: Record<string, string[]> = {
	[AI_TOOL_NAMES.updateContent]: ["target", "changes"]
};

/**
 * Reads a tool call's JSON arguments. Small models sometimes emit broken calls: invalid
 * JSON, or their own control tokens (Gemma's `<|"|>`) in place of quotes, which can shift
 * values into the wrong keys. Those are reported back so the model sends the call again,
 * instead of running a call that silently drops or corrupts part of the request.
 */
function parseArguments(call: AiToolCall): ParsedArguments {
	const raw = call.arguments || "{}";
	const resend = `Nothing was done. Send the complete ${call.name} call again as plain JSON.`;
	if (CONTROL_TOKEN_PATTERN.test(raw)) {
		return { error: `Your ${call.name} call was malformed: it contains model control tokens such as <|"|>. ${resend}` };
	}
	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch (error) {
		const reason = error instanceof Error ? error.message : "invalid JSON";
		return { error: `The arguments of your ${call.name} call are not valid JSON (${reason}). ${resend}` };
	}
	if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
		return { error: `The arguments of your ${call.name} call must be a JSON object. ${resend}` };
	}
	const allowed = TOOL_ARGUMENT_KEYS[call.name];
	const unexpected = allowed ? Object.keys(parsed).filter((key) => !allowed.includes(key)) : [];
	if (unexpected.length > 0) {
		return {
			error: `Your ${call.name} call was malformed: unexpected keys ${unexpected.map((key) => JSON.stringify(key)).join(", ")} (it takes ${allowed.join(", ")}). ${resend}`
		};
	}
	return { args: parsed as Record<string, unknown> };
}

/** Short progress label for the sidebar while a tool runs. */
export function describeToolCall(call: AiToolCall): string {
	const parsed = parseArguments(call);
	const args = "args" in parsed ? parsed.args : {};
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

/** The text inside a presented value; repeater items contribute their child values. */
function searchableText(value: unknown): string {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) return value.map(searchableText).filter(Boolean).join(", ");
	if (typeof value === "object" && value !== null) {
		return Object.entries(value)
			.filter(([key]) => key !== "_id")
			.map(([, entry]) => searchableText(entry))
			.filter(Boolean)
			.join(" · ");
	}
	return "";
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
			const text = searchableText(localeValue);
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

async function run(call: AiToolCall): Promise<{ result: unknown; edit?: EditRecord; update?: UpdateReport }> {
	const parsed = parseArguments(call);
	if ("error" in parsed) {
		const update = call.name === AI_TOOL_NAMES.updateContent ? { saved: [], failed: [{ key: "*", message: parsed.error }] } : undefined;
		return { result: { error: parsed.error }, update };
	}
	const { args } = parsed;
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
				: { error: "Nothing was changed. Fix the problems and call update_content again; don't tell the user it was done.", details: errors };
			return { result, edit: edit ?? undefined, update: reportUpdate(target, changes, errors) };
		}
		default:
			return { result: { error: `Unknown tool "${call.name}".` } };
	}
}

export async function runToolCall(call: AiToolCall): Promise<ToolOutcome> {
	try {
		const { result, edit, update } = await run(call);
		return { content: JSON.stringify(result), edit, update };
	} catch (error) {
		return { content: JSON.stringify({ error: error instanceof Error ? error.message : "The tool failed." }) };
	}
}
