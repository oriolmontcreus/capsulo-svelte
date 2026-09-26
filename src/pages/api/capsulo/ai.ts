import { env } from "cloudflare:workers";

import { AI_ENABLED, AI_MODEL } from "$lib/ai/config";
import {
	AiRequestError,
	buildModelInput,
	normalizeModelOutput,
	parseAiRequestBody,
	toAiRequestError
} from "$lib/ai/protocol";
import { requireUser } from "$lib/server/auth";
import { handle, json, readJson } from "$lib/server/http";

export const prerender = false;

/**
 * One model step for the admin's AI sidebar. The agent loop and its tools run in the
 * browser (drafts live there); this only adds the system prompt and tools, and calls
 * Workers AI through the `AI` binding: no API key, and the free plan's daily allowance
 * fails instead of billing. In `astro dev` the dev proxy answers this route instead
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
		const request = parseAiRequestBody(await readJson<unknown>(context.request));
		const output = await env.AI.run(AI_MODEL, buildModelInput(request)).catch((error: unknown) => {
			throw toAiRequestError(error);
		});
		return json(normalizeModelOutput(output));
	} catch (error) {
		if (!(error instanceof AiRequestError)) throw error;
		return json({ error: error.message, code: error.code }, { status: error.status });
	}
});
