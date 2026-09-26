/**
 * Turns a Workers AI streaming response (server-sent events) into the NDJSON stream the
 * sidebar reads: text deltas as they arrive, then one `done` event with the whole
 * message (tool calls are assembled here, since they arrive in fragments). Shared by
 * the production endpoint and the dev proxy; only web streams, no platform APIs.
 */
import { type AiErrorCode, type AiResponseBody, type AiToolCall, normalizeModelOutput, toAiRequestError } from "./protocol";

export type AiStreamEvent =
	| { type: "text"; delta: string }
	| ({ type: "done" } & AiResponseBody)
	| { type: "error"; error: string; code: AiErrorCode };

export const AI_STREAM_CONTENT_TYPE = "application/x-ndjson; charset=utf-8";

type PartialToolCall = { id?: string; name: string; arguments: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function argumentsText(value: unknown): string {
	if (typeof value === "string") return value;
	return value === undefined || value === null ? "" : JSON.stringify(value);
}

/**
 * @param runWithoutStreaming Asked when the stream ended with neither text nor tool
 *   calls (a model that doesn't stream tool calls): the same request, not streamed.
 */
export function toAiEventStream(
	upstream: ReadableStream<Uint8Array>,
	runWithoutStreaming: () => Promise<unknown>
): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();
	const decoder = new TextDecoder();
	const toolCalls: PartialToolCall[] = [];
	let content = "";
	let usage: AiResponseBody["usage"] = null;
	let buffer = "";
	// Set when the browser goes away (Stop, closed tab): stop reading so the model stops too.
	let cancelled = false;
	const reader = upstream.getReader();

	return new ReadableStream<Uint8Array>({
		async start(controller) {
			const emit = (event: AiStreamEvent) => {
				if (!cancelled) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
			};
			const text = (delta: unknown) => {
				if (typeof delta !== "string" || delta === "") return;
				content += delta;
				emit({ type: "text", delta });
			};

			const handleChunk = (data: unknown) => {
				if (!isRecord(data)) return;
				if (isRecord(data.usage)) usage = normalizeModelOutput({ usage: data.usage }).usage;

				const choice = Array.isArray(data.choices) ? data.choices[0] : undefined;
				if (isRecord(choice)) {
					// OpenAI chat-completions chunks (Gemma 4, GLM, gpt-oss, ...).
					const delta = isRecord(choice.delta) ? choice.delta : isRecord(choice.message) ? choice.message : {};
					text(delta.content);
					if (Array.isArray(delta.tool_calls)) {
						delta.tool_calls.forEach((raw, position) => {
							if (!isRecord(raw)) return;
							const index = typeof raw.index === "number" ? raw.index : position;
							const fn = isRecord(raw.function) ? raw.function : raw;
							const call = (toolCalls[index] ??= { name: "", arguments: "" });
							if (typeof raw.id === "string" && raw.id) call.id = raw.id;
							if (typeof fn.name === "string") call.name += call.name === fn.name ? "" : fn.name;
							call.arguments += argumentsText(fn.arguments);
						});
					}
					return;
				}

				// Older Workers AI chunks: { response, tool_calls? }.
				text(data.response);
				if (Array.isArray(data.tool_calls)) {
					for (const raw of data.tool_calls) {
						if (!isRecord(raw) || typeof raw.name !== "string") continue;
						toolCalls.push({ id: typeof raw.id === "string" ? raw.id : undefined, name: raw.name, arguments: argumentsText(raw.arguments) });
					}
				}
			};

			const handleLine = (line: string) => {
				const trimmed = line.trim();
				if (!trimmed.startsWith("data:")) return;
				const payload = trimmed.slice(5).trim();
				if (!payload || payload === "[DONE]") return;
				try {
					handleChunk(JSON.parse(payload));
				} catch {
					// A malformed chunk shouldn't end the reply.
				}
			};

			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					const lines = buffer.split("\n");
					buffer = lines.pop() ?? "";
					lines.forEach(handleLine);
				}
				if (cancelled) return;
				buffer += decoder.decode();
				if (buffer) handleLine(buffer);

				let calls: AiToolCall[] = toolCalls
					.filter((call) => call?.name)
					.map((call, index) => ({
						id: call.id ?? `call_${index}_${Date.now().toString(36)}`,
						name: call.name,
						arguments: call.arguments || "{}"
					}));

				if (!content.trim() && calls.length === 0) {
					const fallback = normalizeModelOutput(await runWithoutStreaming());
					text(fallback.message.content);
					calls = fallback.message.toolCalls;
					usage = fallback.usage ?? usage;
				}

				emit({ type: "done", message: { content, toolCalls: calls }, usage });
			} catch (error) {
				const aiError = toAiRequestError(error);
				emit({ type: "error", error: aiError.message, code: aiError.code });
			} finally {
				if (!cancelled) controller.close();
			}
		},
		cancel(reason) {
			cancelled = true;
			return reader.cancel(reason);
		}
	});
}
