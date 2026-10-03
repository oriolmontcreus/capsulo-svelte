import { CAPSULO_API_BASE } from "$lib/api/capsulo-client";
import type { AiErrorCode, AiResponseBody } from "./protocol";
import type { AiStreamEvent } from "./stream";
import { t } from "$lib/admin-i18n/i18n.svelte";

export class AgentError extends Error {
	constructor(
		message: string,
		readonly code: AiErrorCode | "network" | "unauthorized"
	) {
		super(message);
	}
}

async function readError(response: Response): Promise<AgentError> {
	const payload = (await response.json().catch(() => null)) as { error?: string; code?: AiErrorCode } | null;
	if (response.status === 401 && !payload?.code) return new AgentError(t("ai.sessionExpired"), "unauthorized");
	return new AgentError(payload?.error ?? t("ai.requestFailed", { status: response.status }), payload?.code ?? "model-error");
}

/**
 * POSTs to one of the AI routes (`/ai`, `/ai/commit-message`) and reads its NDJSON
 * stream (see stream.ts): text deltas go to `onText` as they arrive, and the whole
 * message is returned once the model is done. Failures throw an AgentError.
 */
export async function requestAiStream(
	path: string,
	body: unknown,
	onText: (delta: string) => void,
	signal: AbortSignal
): Promise<AiResponseBody> {
	let response: Response;
	try {
		response = await fetch(`${CAPSULO_API_BASE}${path}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			credentials: "same-origin",
			body: JSON.stringify(body),
			signal
		});
	} catch (error) {
		if (signal.aborted) throw error;
		throw new AgentError(t("ai.unreachable"), "network");
	}
	if (!response.ok || !response.body) throw await readError(response);

	const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = "";
	const handleLine = (line: string): AiResponseBody | null => {
		if (!line.trim()) return null;
		const event = JSON.parse(line) as AiStreamEvent;
		if (event.type === "text") onText(event.delta);
		else if (event.type === "error") throw new AgentError(event.error, event.code);
		else if (event.type === "done") return { message: event.message, usage: event.usage };
		return null;
	};

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			buffer += value;
			const lines = buffer.split("\n");
			buffer = lines.pop() ?? "";
			for (const line of lines) {
				const result = handleLine(line);
				if (result) return result;
			}
		}
		const result = handleLine(buffer);
		if (result) return result;
	} catch (error) {
		if (signal.aborted || error instanceof AgentError) throw error;
		throw new AgentError(t("ai.connectionDropped"), "network");
	} finally {
		reader.cancel().catch(() => {});
	}
	throw new AgentError(t("ai.connectionDropped"), "network");
}
