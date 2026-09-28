import { env } from "cloudflare:workers";

import { buildCommitMessageModelInput, parseCommitMessageRequest } from "$lib/ai/commit-message";
import { AI_ENABLED, AI_MODEL } from "$lib/ai/config";
import { AiRequestError, toAiRequestError } from "$lib/ai/protocol";
import { AI_STREAM_CONTENT_TYPE, toAiEventStream } from "$lib/ai/stream";
import { requireUser } from "$lib/server/auth";
import { handle, json, readJson } from "$lib/server/http";

export const prerender = false;

/**
 * Drafts a commit message for the Changes page, streamed as NDJSON like `/ai` (see
 * stream.ts). The browser sends the changes and the author's recent messages; this
 * adds the prompt and calls Workers AI. In `astro dev` the dev proxy answers this
 * route instead (vite-plugin-capsulo-ai-dev.ts).
 */
export const POST = handle(async (context) => {
	await requireUser(context);
	try {
		if (!AI_ENABLED) throw new AiRequestError(404, "not-configured", "The AI agent is turned off in capsulo.config.ts.");
		if (!env.AI) {
			throw new AiRequestError(
				503,
				"not-configured",
				'The AI binding is missing. Add "ai": { "binding": "AI" } to wrangler.jsonc and deploy again.'
			);
		}
		const ai = env.AI;
		const request = parseCommitMessageRequest(await readJson<unknown>(context.request));
		const upstream = (await ai
			.run(AI_MODEL, buildCommitMessageModelInput(request, { stream: true }))
			.catch((error: unknown) => {
				throw toAiRequestError(error);
			})) as ReadableStream<Uint8Array>;
		const events = toAiEventStream(upstream, () => ai.run(AI_MODEL, buildCommitMessageModelInput(request)));
		return new Response(events, {
			headers: { "Content-Type": AI_STREAM_CONTENT_TYPE, "Cache-Control": "no-store" }
		});
	} catch (error) {
		if (!(error instanceof AiRequestError)) throw error;
		return json({ error: error.message, code: error.code }, { status: error.status });
	}
});
