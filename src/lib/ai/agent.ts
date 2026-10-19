import type { EditRecord } from "./edits";
import type { AiMessage, AiResponseBody } from "./protocol";
import { AgentError, requestAiStream } from "./stream-client";
import { describeToolCall, runToolCall } from "./tool-runner";

/** Model calls per user message. Each one costs part of the free daily allowance. */
const MAX_STEPS = 8;
/** Tool results from earlier turns are shortened to this before being resent. */
const OLD_TOOL_RESULT_CHARS = 1500;
/** Extra attempts for a model step that failed in a way worth retrying (dropped stream, empty reply). */
const MAX_STEP_RETRIES = 2;
const RETRYABLE_CODES = new Set(["network", "model-error", "empty-reply"]);

export type AgentCallbacks = {
	/** What the agent is doing right now ("Reading Home"), or null when it's thinking. */
	onProgress: (label: string | null) => void;
	/** A new model step started; its text streams in through `onText`. */
	onStepStart: () => void;
	onText: (delta: string) => void;
	onEdit: (edit: EditRecord) => void;
	/** The step that was streaming failed and will be retried: drop the text it sent. */
	onStepDiscarded: () => void;
	/** Something the user must know regardless of what the model says (e.g. an edit wasn't saved). */
	onNotice: (text: string) => void;
};

/**
 * Tool results are the bulk of every request (page contents). Once the user has moved
 * on to a new message, older results are cut down: the model can read them again.
 */
function compactTranscript(transcript: AiMessage[]): AiMessage[] {
	let lastUserIndex = -1;
	transcript.forEach((message, index) => {
		if (message.role === "user") lastUserIndex = index;
	});
	return transcript.map((message, index) =>
		message.role === "tool" && index < lastUserIndex && message.content.length > OLD_TOOL_RESULT_CHARS
			? {
					...message,
					content: `${message.content.slice(0, OLD_TOOL_RESULT_CHARS)}… [older result shortened; call the tool again for the full content]`
				}
			: message
	);
}

/** Asks the model for its next step, passing on its text as it streams in. */
function requestStep(
	context: string,
	transcript: AiMessage[],
	onText: (delta: string) => void,
	signal: AbortSignal
): Promise<AiResponseBody> {
	return requestAiStream("/ai", { context, messages: compactTranscript(transcript) }, onText, signal);
}

function wait(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener("abort", () => {
			clearTimeout(timer);
			reject(new DOMException("Stopped", "AbortError"));
		}, { once: true });
	});
}

/**
 * requestStep, retried when the model or the connection fails in a passing way: a dropped
 * stream, an empty reply, a model error. Users shouldn't have to press Send again for those.
 */
async function requestStepWithRetries(
	context: string,
	transcript: AiMessage[],
	callbacks: AgentCallbacks,
	signal: AbortSignal
): Promise<AiResponseBody> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await requestStep(context, transcript, callbacks.onText, signal);
		} catch (error) {
			const retryable = error instanceof AgentError && RETRYABLE_CODES.has(error.code);
			if (signal.aborted || !retryable || attempt >= MAX_STEP_RETRIES) throw error;
			console.warn(`[capsulo ai] retrying a failed step (${attempt + 1}/${MAX_STEP_RETRIES})`, error);
			callbacks.onStepDiscarded();
			callbacks.onProgress("Retrying");
			await wait(800 * (attempt + 1), signal);
			callbacks.onProgress(null);
		}
	}
}

/**
 * Runs one user message to completion: asks the model, runs the tools it calls in
 * the browser (reads and draft edits), sends the results back, and repeats until it
 * answers. `transcript` must already end with the user's message; the new assistant
 * and tool turns are appended to it in place, so a stopped run keeps what it did.
 */
export async function runAgent(
	context: string,
	transcript: AiMessage[],
	callbacks: AgentCallbacks,
	signal: AbortSignal
): Promise<void> {
	let edited = false;
	/** Requested changes not saved yet, by `instanceId:field` ("*": a call that couldn't be read). */
	const unsaved = new Map<string, string>();
	// The model's summary can claim a change that a tool rejected; the user hears the truth.
	const reportUnsaved = () => {
		if (unsaved.size === 0) return;
		const messages = [...unsaved.values()];
		const detail = messages[0].replace(/^changes\[\d+\]:\s*/, "");
		const more = messages.length > 1 ? ` (and ${messages.length - 1} more)` : "";
		callbacks.onNotice(`Some of the requested changes weren't saved: ${detail}${more} Only the changes listed above were made.`);
	};

	for (let step = 0; step < MAX_STEPS; step++) {
		callbacks.onProgress(null);
		callbacks.onStepStart();
		let message: AiResponseBody["message"];
		try {
			({ message } = await requestStepWithRetries(context, transcript, callbacks, signal));
		} catch (error) {
			// The edit is saved and its card (Review/Undo) is showing; an empty wrap-up
			// reply isn't worth an error.
			if (!(edited && error instanceof AgentError && error.code === "empty-reply")) throw error;
			const done = "Done. The changes are saved as a draft; review them above.";
			transcript.push({ role: "assistant", content: done });
			callbacks.onText(done);
			reportUnsaved();
			return;
		}
		transcript.push({ role: "assistant", content: message.content, toolCalls: message.toolCalls.length ? message.toolCalls : undefined });
		if (message.toolCalls.length === 0) {
			reportUnsaved();
			return;
		}

		for (const call of message.toolCalls) {
			if (signal.aborted) throw new DOMException("Stopped", "AbortError");
			callbacks.onProgress(describeToolCall(call));
			const outcome = await runToolCall(call);
			if (outcome.edit) {
				edited = true;
				callbacks.onEdit(outcome.edit);
			}
			if (outcome.update) {
				if (outcome.update.saved.length > 0) unsaved.delete("*");
				for (const key of outcome.update.saved) unsaved.delete(key);
				for (const { key, message } of outcome.update.failed) unsaved.set(key, message);
			}
			transcript.push({ role: "tool", toolCallId: call.id, content: outcome.content });
		}
	}
	const stopped = "I stopped here to save your daily AI allowance. Send another message to let me continue.";
	transcript.push({ role: "assistant", content: stopped });
	callbacks.onStepStart();
	callbacks.onText(stopped);
	reportUnsaved();
}

/**
 * After a stopped run the transcript can end with tool calls that never got a result,
 * which the model API rejects. Answer them so the chat can continue.
 */
export function closeOpenToolCalls(transcript: AiMessage[]): void {
	const answered = new Set(transcript.flatMap((message) => (message.role === "tool" ? [message.toolCallId] : [])));
	for (let index = 0; index < transcript.length; index++) {
		const message = transcript[index];
		if (message.role !== "assistant" || !message.toolCalls) continue;
		const missing = message.toolCalls.filter((call) => !answered.has(call.id));
		let insertAt = index + 1;
		while (transcript[insertAt]?.role === "tool") insertAt++;
		for (const call of missing) {
			transcript.splice(insertAt++, 0, { role: "tool", toolCallId: call.id, content: JSON.stringify({ error: "Stopped by the user." }) });
			answered.add(call.id);
		}
	}
}
