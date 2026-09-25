/**
 * Browser client for the CMS API served by the project's Worker (`src/pages/api/capsulo`).
 * Every call returns `{ data, error }` instead of throwing, matching how the admin
 * already handled Supabase results.
 */

export const CAPSULO_API_BASE = "/api/capsulo";

export type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

export async function capsuloFetch<T>(path: string, init: RequestInit = {}): Promise<ApiResult<T>> {
	const headers = new Headers(init.headers);
	if (init.body !== undefined && !(init.body instanceof Blob) && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}

	let response: Response;
	try {
		response = await fetch(`${CAPSULO_API_BASE}${path}`, {
			...init,
			headers,
			credentials: "same-origin"
		});
	} catch (error) {
		return { data: null, error: error instanceof Error ? error.message : "Network error." };
	}

	if (response.status === 401 && !path.startsWith("/auth/")) redirectToLogin();

	const payload = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
	if (!response.ok) {
		return { data: null, error: payload?.error ?? `Request failed (${response.status}).` };
	}
	return { data: payload as T, error: null };
}

/** An expired or revoked session inside the admin sends the editor back to the login page. */
function redirectToLogin(): void {
	if (typeof window === "undefined") return;
	const { pathname, search } = window.location;
	if (!pathname.startsWith("/admin") || pathname.startsWith("/admin/login")) return;
	window.location.replace(`/admin/login?next=${encodeURIComponent(pathname + search)}`);
}

export function jsonBody(value: unknown): string {
	return JSON.stringify(value);
}
