import type { APIContext } from "astro";

export class HttpError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
	}
}

export function json(data: unknown, init?: ResponseInit): Response {
	const headers = new Headers(init?.headers);
	headers.set("Content-Type", "application/json; charset=utf-8");
	if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store");
	return new Response(JSON.stringify(data), { ...init, headers });
}

/** Wraps an endpoint so thrown HttpErrors become `{ error }` JSON responses. */
export function handle(
	run: (context: APIContext) => Promise<Response>
): (context: APIContext) => Promise<Response> {
	return async (context) => {
		try {
			return await run(context);
		} catch (error) {
			if (error instanceof HttpError) {
				return json({ error: error.message }, { status: error.status });
			}
			console.error("[capsulo api]", error);
			return json({ error: "Internal error." }, { status: 500 });
		}
	};
}

const MAX_JSON_BYTES = 8 * 1024 * 1024;

export async function readJson<T>(request: Request): Promise<T> {
	const length = Number(request.headers.get("Content-Length") ?? 0);
	if (length > MAX_JSON_BYTES) throw new HttpError(413, "Request body is too large.");
	try {
		return (await request.json()) as T;
	} catch {
		throw new HttpError(400, "Request body must be valid JSON.");
	}
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function requireString(value: unknown, field: string, maxLength = 500): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new HttpError(400, `"${field}" is required.`);
	}
	if (value.length > maxLength) throw new HttpError(400, `"${field}" is too long.`);
	return value;
}

/**
 * Cookie-authenticated writes must come from this site. SameSite=Lax already blocks
 * cross-site POSTs in modern browsers; this also covers older ones.
 */
export function assertSameOrigin(request: Request): void {
	if (request.method === "GET" || request.method === "HEAD") return;
	const origin = request.headers.get("Origin");
	if (origin && origin !== new URL(request.url).origin) {
		throw new HttpError(403, "Cross-origin request rejected.");
	}
}

export function nowIso(): string {
	return new Date().toISOString();
}
