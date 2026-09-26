import { CAPSULO_API_BASE } from "$lib/api/capsulo-client";
import type { EditRecord } from "./edits";
import type { AiErrorCode, AiMessage, AiResponseBody } from "./protocol";
import { describeToolCall, runToolCall } from "./tool-runner";

/** Model calls per user message. Each one costs part of the free daily allowance. */
const MAX_STEPS = 8;
/** Tool results from earlier turns are shortened to this before being resent. */
const OLD_TOOL_RESULT_CHARS = 1500;

export class AgentError extends Error {
	constructor(
		message: string,
		readonly code: AiErrorCode | "network" | "unauthorized"
	) {
		super(message);
	}
}

export type AgentCallbacks = {
	/** What the agent is doing right now ("Reading Home"), or null when it's thinking. */
	onProgress: (label: string | null) => void;
	onEdit: (edit: EditRecord) => void;
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

async function requestStep(context: string, transcript: AiMessage[], signal: AbortSignal): Promise<AiResponseBody> {
	let response: Response;
	try {
		response = await fetch(`${CAPSULO_API_BASE}/ai`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify({ context, messages: compactTranscript(transcript) }),
			signal
		});
	} catch (error) {
		if (signal.aborted) throw error;
		throw new AgentError("Could not reach the server. Check your connection and try again.", "network");
	}

	const payload = (await response.json().catch(() => null)) as (AiResponseBody & { error?: string; code?: AiErrorCode }) | null;
	if (!response.ok || !payload?.message) {
		if (response.status === 401 && !payload?.code) throw new AgentError("Your session expired. Sign in again.", "unauthorized");
		throw new AgentError(payload?.error ?? `The AI request failed (${response.status}).`, payload?.code ?? "model-error");
	}
	return payload;
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
): Promise<string> {
	for (let step = 0; step < MAX_STEPS; step++) {
		callbacks.onProgress(null);
		const { message } = await requestStep(context, transcript, signal);
		transcript.push({ role: "assistant", content: message.content, toolCalls: message.toolCalls.length ? message.toolCalls : undefined });
		if (message.toolCalls.length === 0) return message.content.trim();

		for (const call of message.toolCalls) {
			if (signal.aborted) throw new DOMException("Stopped", "AbortError");
			callbacks.onProgress(describeToolCall(call));
			const outcome = await runToolCall(call);
			if (outcome.edit) callbacks.onEdit(outcome.edit);
			transcript.push({ role: "tool", toolCallId: call.id, content: outcome.content });
		}
	}
	const stopped = "I stopped here to save your daily AI allowance. Send another message to let me continue.";
	transcript.push({ role: "assistant", content: stopped });
	return stopped;
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
