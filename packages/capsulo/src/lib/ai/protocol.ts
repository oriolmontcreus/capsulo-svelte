/**
 * Wire format between the admin's AI sidebar and `/api/capsulo/ai`, plus the pieces
 * both sides share: the tool definitions, the model input the Worker sends to Workers
 * AI and the normalization of its (model-dependent) output. No browser or Worker APIs
 * here, so the production endpoint and the dev proxy use the exact same code.
 */

import { AI_SYSTEM_PROMPT } from "./prompt";
import { AI_TOOLS } from "./tools";

/**
 * Cheap, fast, tool-calling model with a 256K context window. Roughly 30 chat
 * messages fit in Workers AI's free daily allocation (10,000 Neurons).
 */
export const DEFAULT_AI_MODEL = "@cf/google/gemma-4-26b-a4b-it";

const MAX_OUTPUT_TOKENS = 2048;
const MAX_MESSAGES = 80;
/** ~100K tokens: keeps one request well inside the model's context and the free quota. */
const MAX_REQUEST_CHARS = 400_000;

export type AiToolCall = {
	id: string;
	name: string;
	/** JSON-encoded arguments, as the model produced them. */
	arguments: string;
};

export type AiMessage =
	| { role: "user"; content: string }
	| { role: "assistant"; content: string; toolCalls?: AiToolCall[] }
	| { role: "tool"; toolCallId: string; content: string };

export type AiRequestBody = {
	/** Site overview and where the editor is, built by the admin (see site-context.ts). */
	context: string;
	messages: AiMessage[];
};

export type AiUsage = { promptTokens: number; completionTokens: number };

export type AiResponseBody = {
	message: { content: string; toolCalls: AiToolCall[] };
	usage: AiUsage | null;
};

/** Machine-readable reasons the sidebar turns into specific messages. */
export type AiErrorCode =
	| "not-configured"
	| "dev-login-required"
	| "quota-exceeded"
	| "bad-request"
	| "model-error";

export class AiRequestError extends Error {
	constructor(
		readonly status: number,
		readonly code: AiErrorCode,
		message: string
	) {
		super(message);
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
	if (typeof value !== "string") throw new AiRequestError(400, "bad-request", `"${field}" must be a string.`);
	return value;
}

function parseToolCalls(value: unknown, index: number): AiToolCall[] | undefined {
	if (value === undefined) return undefined;
	if (!Array.isArray(value)) throw new AiRequestError(400, "bad-request", `messages[${index}].toolCalls must be an array.`);
	return value.map((call, callIndex) => {
		const path = `messages[${index}].toolCalls[${callIndex}]`;
		if (!isRecord(call)) throw new AiRequestError(400, "bad-request", `${path} must be an object.`);
		return {
			id: asString(call.id, `${path}.id`),
			name: asString(call.name, `${path}.name`),
			arguments: asString(call.arguments, `${path}.arguments`)
		};
	});
}

/** Validates a request body. Only user, assistant and tool turns are accepted: the system prompt is the server's. */
export function parseAiRequestBody(body: unknown): AiRequestBody {
	if (!isRecord(body)) throw new AiRequestError(400, "bad-request", "Expected a JSON object.");
	const context = asString(body.context ?? "", "context");
	if (!Array.isArray(body.messages) || body.messages.length === 0) {
		throw new AiRequestError(400, "bad-request", '"messages" must be a non-empty array.');
	}
	if (body.messages.length > MAX_MESSAGES) {
		throw new AiRequestError(400, "bad-request", "This conversation is too long. Start a new chat.");
	}

	const messages = body.messages.map((message, index): AiMessage => {
		if (!isRecord(message)) throw new AiRequestError(400, "bad-request", `messages[${index}] must be an object.`);
		const content = asString(message.content ?? "", `messages[${index}].content`);
		switch (message.role) {
			case "user":
				return { role: "user", content };
			case "assistant":
				return { role: "assistant", content, toolCalls: parseToolCalls(message.toolCalls, index) };
			case "tool":
				return { role: "tool", toolCallId: asString(message.toolCallId, `messages[${index}].toolCallId`), content };
			default:
				throw new AiRequestError(400, "bad-request", `messages[${index}].role is not allowed.`);
		}
	});

	const size = context.length + messages.reduce((total, message) => total + message.content.length, 0);
	if (size > MAX_REQUEST_CHARS) {
		throw new AiRequestError(400, "bad-request", "This conversation is too long. Start a new chat.");
	}

	return { context, messages };
}

/** The `env.AI.run(model, input)` input: OpenAI-style chat messages with function tools. */
export function buildModelInput(request: AiRequestBody, options: { stream?: boolean } = {}): Record<string, unknown> {
	const system = request.context ? `${AI_SYSTEM_PROMPT}\n\n${request.context}` : AI_SYSTEM_PROMPT;
	return {
		messages: [
			{ role: "system", content: system },
			...request.messages.map((message) => {
				if (message.role === "tool") {
					return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
				}
				if (message.role === "assistant" && message.toolCalls?.length) {
					return {
						role: "assistant",
						content: message.content,
						tool_calls: message.toolCalls.map((call) => ({
							id: call.id,
							type: "function",
							function: { name: call.name, arguments: call.arguments }
						}))
					};
				}
				return { role: message.role, content: message.content };
			})
		],
		tools: AI_TOOLS,
		max_tokens: MAX_OUTPUT_TOKENS,
		temperature: 0.2,
		...(options.stream ? { stream: true } : {})
	};
}

function stringifyArguments(value: unknown): string {
	if (typeof value === "string") return value;
	return JSON.stringify(value ?? {});
}

function normalizeToolCall(raw: unknown, index: number): AiToolCall | null {
	if (!isRecord(raw)) return null;
	const id = typeof raw.id === "string" && raw.id ? raw.id : `call_${index}_${Date.now().toString(36)}`;
	// OpenAI shape: { id, type: "function", function: { name, arguments } }
	if (isRecord(raw.function) && typeof raw.function.name === "string") {
		return { id, name: raw.function.name, arguments: stringifyArguments(raw.function.arguments) };
	}
	// Legacy Workers AI shape: { name, arguments }
	if (typeof raw.name === "string") return { id, name: raw.name, arguments: stringifyArguments(raw.arguments) };
	return null;
}

function normalizeUsage(raw: unknown): AiUsage | null {
	if (!isRecord(raw)) return null;
	return {
		promptTokens: Number(raw.prompt_tokens ?? 0) || 0,
		completionTokens: Number(raw.completion_tokens ?? 0) || 0
	};
}

/**
 * Workers AI models answer in one of two shapes: OpenAI chat completions
 * (`choices[0].message`, e.g. Gemma 4, GLM, gpt-oss) or the older
 * `{ response, tool_calls }` (e.g. Llama). Both become one message.
 */
export function normalizeModelOutput(raw: unknown): AiResponseBody {
	if (!isRecord(raw)) throw new AiRequestError(502, "model-error", "The model returned an empty response.");

	let content: unknown;
	let toolCalls: unknown;
	const choice = Array.isArray(raw.choices) ? raw.choices[0] : undefined;
	if (isRecord(choice) && isRecord(choice.message)) {
		content = choice.message.content;
		toolCalls = choice.message.tool_calls;
	} else {
		content = raw.response;
		toolCalls = raw.tool_calls;
	}

	const calls = Array.isArray(toolCalls)
		? toolCalls.map(normalizeToolCall).filter((call): call is AiToolCall => call !== null)
		: [];

	return {
		message: {
			content: typeof content === "string" ? content : content == null ? "" : JSON.stringify(content),
			toolCalls: calls
		},
		usage: normalizeUsage(raw.usage)
	};
}

/**
 * Maps a Workers AI failure to a sidebar-friendly error. On the free plan, going over
 * the daily allocation fails (code 4006) instead of billing anything.
 */
export function toAiRequestError(error: unknown): AiRequestError {
	if (error instanceof AiRequestError) return error;
	const message = error instanceof Error ? error.message : String(error);
	if (/4006|daily free allocation|neurons/i.test(message)) {
		return new AiRequestError(
			429,
			"quota-exceeded",
			"The AI agent used today's free Workers AI allowance. It resets at 00:00 UTC."
		);
	}
	return new AiRequestError(502, "model-error", `The AI model failed: ${message}`);
}
