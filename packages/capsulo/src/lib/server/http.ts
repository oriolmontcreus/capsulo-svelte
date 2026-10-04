import type { APIContext } from "astro";

import {
	UI_LOCALE_COOKIE,
	resolveUiLocale,
	translate,
	type MessageKey,
	type MessageParams,
	type UiLocale
} from "../admin-i18n/core";

export class HttpError extends Error {
	/** Set for errors editors can see: sent in the admin language of the request. */
	translation?: { key: MessageKey; params?: MessageParams };

	constructor(
		readonly status: number,
		message: string,
		/** Extra JSON fields sent next to `error`, e.g. the validation issues of a 422. */
		readonly details?: Record<string, unknown>
	) {
		super(message);
	}

	/** An error whose message is an admin UI message, translated per request. */
	static translated(
		status: number,
		key: MessageKey,
		params?: MessageParams,
		details?: Record<string, unknown>
	): HttpError {
		const error = new HttpError(status, translate("en", key, params), details);
		error.translation = { key, params };
		return error;
	}
}

/** The admin language of the editor making the request (their choice, else Accept-Language). */
export function requestUiLocale(context: Pick<APIContext, "cookies" | "request">): UiLocale {
	const acceptLanguage = context.request.headers.get("Accept-Language") ?? "";
	return resolveUiLocale({
		stored: context.cookies.get(UI_LOCALE_COOKIE)?.value,
		browserLanguages: acceptLanguage.split(",").map((part) => part.split(";")[0] ?? "")
	});
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
				const message = error.translation
					? translate(requestUiLocale(context), error.translation.key, error.translation.params)
					: error.message;
				return json({ ...error.details, error: message }, { status: error.status });
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
