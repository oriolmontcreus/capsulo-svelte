import { capsuloFetch } from "$lib/api/capsulo-client";
import { cleanCommitMessage } from "$lib/ai/commit-message";
import { AgentError, requestAiStream } from "$lib/ai/stream-client";
import { getCapsuleByKey } from "$lib/capsules/core/registry";
import { DEFAULT_LOCALE } from "$lib/config/i18n-config";
import { loadAllPageEditorCacheDocuments } from "$lib/PageEditor/page-editor-cache";
import { pageDisplayName } from "./changed-pages";
import { describeChanges, type CapsuleInfo } from "./commit-message-context";
import { computePageChangeSet } from "./diff-model";
import { capsuleKeyFromInstanceId, resolveInstanceDefaults } from "./schema-defaults";

/** How many earlier messages the model sees to pick up the author's style. */
const STYLE_EXAMPLES = 5;

function resolveCapsule(instanceId: string): CapsuleInfo | undefined {
	const key = capsuleKeyFromInstanceId(instanceId);
	const capsule = getCapsuleByKey(key);
	if (!capsule) return undefined;
	return { title: capsule.meta?.displayName ?? capsule.schema.name ?? key, fields: capsule.schema.fields };
}

/** The given pages' pending changes as text, read from the local drafts like the Changes list. */
async function describePendingChanges(pageIds: string[]): Promise<string> {
	const wanted = new Set(pageIds);
	const documents = (await loadAllPageEditorCacheDocuments()).filter((document) => wanted.has(document.pageId));
	const pages = documents
		.map((document) => ({
			name: pageDisplayName(document.pageId),
			changeSet: computePageChangeSet(
				document.pageId,
				document.baselineValuesByInstance,
				document.valuesByInstance,
				resolveInstanceDefaults
			)
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
	return describeChanges(pages, { resolveCapsule, defaultLocale: DEFAULT_LOCALE });
}

async function fetchCommitMessages(query: string): Promise<string[]> {
	const { data } = await capsuloFetch<{ commits: { message: string }[] }>(`/commits?${query}`);
	return data?.commits.map((commit) => commit.message) ?? [];
}

/**
 * The signed-in user's latest commit messages, topped up with the team's when they
 * have made fewer than five, so there is always a house style to follow. Failures
 * just mean fewer examples.
 */
async function loadRecentCommitMessages(): Promise<string[]> {
	const own = await fetchCommitMessages(`author=me&limit=${STYLE_EXAMPLES}`);
	if (own.length >= STYLE_EXAMPLES) return own;
	const team = await fetchCommitMessages(`limit=${STYLE_EXAMPLES}`);
	return [...new Set([...own, ...team])].slice(0, STYLE_EXAMPLES);
}

/**
 * Asks the AI for a commit message describing the given pages' pending changes, in
 * the style of the author's recent messages and building on `draft` when it isn't
 * empty. The raw text streams to `onText`; the cleaned-up message is returned.
 * Throws an AgentError on failure, including an empty reply.
 */
export async function generateCommitMessage(options: {
	pageIds: string[];
	draft: string;
	onText: (textSoFar: string) => void;
	signal: AbortSignal;
}): Promise<string> {
	const [changes, recentMessages] = await Promise.all([
		describePendingChanges(options.pageIds),
		loadRecentCommitMessages()
	]);

	console.debug("[capsulo ai] generating a commit message", {
		changesChars: changes.length,
		styleExamples: recentMessages.length,
		hasDraft: options.draft.trim().length > 0
	});

	let text = "";
	const { message } = await requestAiStream(
		"/ai/commit-message",
		{ changes, recentMessages, draft: options.draft },
		(delta) => {
			text += delta;
			options.onText(text);
		},
		options.signal
	);
	const cleaned = cleanCommitMessage(message.content);
	if (!cleaned) {
		console.warn("[capsulo ai] the commit message came back empty", { raw: message.content });
		throw new AgentError("The AI returned an empty commit message. Try again.", "model-error");
	}
	return cleaned;
}
