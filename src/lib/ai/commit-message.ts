/**
 * Wire format and model input for the Changes page's "Generate commit message" button.
 * Like protocol.ts, no browser or Worker APIs: the production endpoint and the dev
 * proxy share this code. The browser gathers everything (the changes, the author's
 * recent messages, what they already typed), since the dev proxy can't reach D1.
 */

import { AiRequestError } from "./protocol";

const MAX_CHANGES_CHARS = 40_000;
const MAX_RECENT_MESSAGES = 10;
const MAX_RECENT_MESSAGE_CHARS = 1_000;
const MAX_DRAFT_CHARS = 2_000;
/**
 * Generous for a one-line message on purpose: if a reasoning model thinks anyway, a
 * tight cap is spent on reasoning and the reply comes back empty.
 */
const MAX_OUTPUT_TOKENS = 1024;

export type CommitMessageRequest = {
	/** The pending changes, as text (see describeChanges in commit-message-ai.ts). */
	changes: string;
	/** The author's latest commit messages, newest first: the style to imitate. */
	recentMessages: string[];
	/** What the author already typed, to complete or refine rather than replace. */
	draft: string;
};

const SYSTEM_PROMPT = `You write the commit message for a set of content edits made in a website's CMS.

Rules:
- Describe what changed from the reader's point of view (which page, which section, what content), not how it is stored.
- Imitate the example messages closely: their language, tone, casing, tense, prefixes (such as "feat:" or "content:"), length, and whether they add a body under the first line. If there are no examples, write one short sentence-case line in English.
- Keep the first line short, ideally under 72 characters. Only add a body (after a blank line) when the examples do and the change needs more detail.
- When the author has started a message, keep their wording and intent: complete or refine it instead of replacing it.
- Reply with the commit message only: no quotes, no code fences, no explanations.`;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedString(value: unknown, field: string, maxLength: number): string {
	if (value === undefined || value === null) return "";
	if (typeof value !== "string") throw new AiRequestError(400, "bad-request", `"${field}" must be a string.`);
	if (value.length > maxLength) throw new AiRequestError(400, "bad-request", `"${field}" is too long.`);
	return value;
}

export function parseCommitMessageRequest(body: unknown): CommitMessageRequest {
	if (!isRecord(body)) throw new AiRequestError(400, "bad-request", "Expected a JSON object.");
	const changes = boundedString(body.changes, "changes", MAX_CHANGES_CHARS).trim();
	if (!changes) throw new AiRequestError(400, "bad-request", "There are no changes to describe.");

	const rawMessages = body.recentMessages ?? [];
	if (!Array.isArray(rawMessages)) throw new AiRequestError(400, "bad-request", '"recentMessages" must be an array.');
	const recentMessages = rawMessages
		.slice(0, MAX_RECENT_MESSAGES)
		.map((message, index) => boundedString(message, `recentMessages[${index}]`, MAX_RECENT_MESSAGE_CHARS).trim())
		.filter(Boolean);

	return { changes, recentMessages, draft: boundedString(body.draft, "draft", MAX_DRAFT_CHARS).trim() };
}

function userPrompt(request: CommitMessageRequest): string {
	const parts: string[] = [];
	if (request.recentMessages.length > 0) {
		const examples = request.recentMessages.map((message) => `<message>\n${message}\n</message>`).join("\n");
		parts.push(`Recent commit messages from this project, newest first (imitate their style):\n${examples}`);
	} else {
		parts.push("There are no earlier commit messages to imitate.");
	}
	parts.push(`Changes in this commit:\n${request.changes}`);
	if (request.draft) {
		parts.push(
			`The author already started writing this message:\n<draft>\n${request.draft}\n</draft>\nKeep their wording and intent; complete or refine it.`
		);
	}
	parts.push("Write the commit message now.");
	return parts.join("\n\n");
}

/** The `env.AI.run(model, input)` input: a plain chat completion, no tools. */
export function buildCommitMessageModelInput(
	request: CommitMessageRequest,
	options: { stream?: boolean } = {}
): Record<string, unknown> {
	return {
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: userPrompt(request) }
		],
		max_tokens: MAX_OUTPUT_TOKENS,
		temperature: 0.3,
		// Gemma 4 (the default model) can think before answering; a commit message doesn't
		// need it, and skipping it is faster and cheaper.
		chat_template_kwargs: { enable_thinking: false },
		...(options.stream ? { stream: true } : {})
	};
}

const WRAPPING_QUOTES: [string, string][] = [
	['"', '"'],
	["'", "'"],
	["`", "`"],
	["“", "”"]
];

/** Removes what models like to wrap a commit message in: fences, quotes, a "Commit message:" label. */
export function cleanCommitMessage(text: string): string {
	let message = text.trim();
	const fenced = /^```[\w-]*\n([\s\S]*?)\n?```$/.exec(message);
	if (fenced) message = fenced[1].trim();
	message = message.replace(/^(\*\*)?commit message:?(\*\*)?:?\s*/i, "").trim();
	for (const [open, close] of WRAPPING_QUOTES) {
		if (message.length >= 2 && message.startsWith(open) && message.endsWith(close)) {
			const inner = message.slice(open.length, -close.length);
			if (!inner.includes(open) && !inner.includes(close)) message = inner.trim();
		}
	}
	return message;
}
