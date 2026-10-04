import { env } from "cloudflare:workers";

import { AI_ENABLED, AI_MODEL } from "$lib/ai/config";
import { AiRequestError, buildModelInput, parseAiRequestBody, toAiRequestError } from "$lib/ai/protocol";
import { AI_STREAM_CONTENT_TYPE, toAiEventStream } from "$lib/ai/stream";
import { requireUser } from "$lib/server/auth";
import { handle, json, readJson } from "$lib/server/http";

export const prerender = false;

/**
 * One model step for the admin's AI sidebar, streamed as NDJSON (see stream.ts). The
 * agent loop and its tools run in the browser (drafts live there); this only adds the
 * system prompt and tools, and calls Workers AI through the `AI` binding: no API key,
 * and the free plan's daily allowance fails instead of billing. In `astro dev` the dev proxy answers this route instead
 * (vite-plugin-capsulo-ai-dev.ts).
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
		const request = parseAiRequestBody(await readJson<unknown>(context.request));
		// Errors before the first token (quota, bad input) still come back as JSON.
		const upstream = (await ai.run(AI_MODEL, buildModelInput(request, { stream: true })).catch((error: unknown) => {
			throw toAiRequestError(error);
		})) as ReadableStream<Uint8Array>;
		const events = toAiEventStream(upstream, () => ai.run(AI_MODEL, buildModelInput(request)));
		return new Response(events, {
			headers: { "Content-Type": AI_STREAM_CONTENT_TYPE, "Cache-Control": "no-store" }
		});
	} catch (error) {
		if (!(error instanceof AiRequestError)) throw error;
		return json({ error: error.message, code: error.code }, { status: error.status });
	}
});
