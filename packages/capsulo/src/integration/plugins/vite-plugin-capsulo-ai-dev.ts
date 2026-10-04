import { execFile } from "node:child_process";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vite";

import { buildCommitMessageModelInput, parseCommitMessageRequest } from "../../lib/ai/commit-message";
import { AiRequestError, buildModelInput, parseAiRequestBody, toAiRequestError } from "../../lib/ai/protocol";
import { AI_STREAM_CONTENT_TYPE, toAiEventStream } from "../../lib/ai/stream";

type ModelInputBuilder = (body: unknown) => (options?: { stream?: boolean }) => Record<string, unknown>;

/** The AI routes this proxy answers, each turning a request body into Workers AI input. */
const AI_ROUTES: Record<string, ModelInputBuilder> = {
	"/api/capsulo/ai": (body) => {
		const request = parseAiRequestBody(body);
		return (options) => buildModelInput(request, options);
	},
	"/api/capsulo/ai/commit-message": (body) => {
		const request = parseCommitMessageRequest(body);
		return (options) => buildCommitMessageModelInput(request, options);
	}
};
/** Same override Wrangler honours, e.g. for a proxy or a test double. */
const CLOUDFLARE_API = process.env.CLOUDFLARE_API_BASE_URL ?? "https://api.cloudflare.com/client/v4";
const LOGIN_HINT = "Run `npx wrangler login` in the project folder, then try again.";

type Credentials = { token: string; accountId: string };
type CloudflareError = { code?: number; message?: string };

/**
 * Cloudflare API codes for a missing, expired or revoked token. An expired login
 * doesn't always come back as a 401/403, so the codes and wording are checked too.
 */
const AUTH_ERROR_CODES = new Set([6003, 6111, 9106, 9109, 10000]);
const AUTH_ERROR_MESSAGE = /authenticat|unauthori[sz]ed|invalid (access )?token|token (has )?expired/i;

function isAuthFailure(status: number, errors: CloudflareError[]): boolean {
	if (status === 401 || status === 403) return true;
	return errors.some(
		(error) =>
			(typeof error.code === "number" && AUTH_ERROR_CODES.has(error.code)) ||
			(typeof error.message === "string" && AUTH_ERROR_MESSAGE.test(error.message))
	);
}

/** Only local dev uses a personal login: in production the Worker's AI binding needs none. */
function loginRequired(message: string, detail?: unknown): AiRequestError {
	console.warn(
		"[capsulo ai] Cloudflare login needed for the AI in local dev: run `npx wrangler login`, then try again.",
		...(detail === undefined ? [] : [detail])
	);
	return new AiRequestError(401, "dev-login-required", `${message} ${LOGIN_HINT}`);
}

/**
 * Workers AI has no local simulator: its binding always calls Cloudflare, and with it
 * `astro dev` refuses to start unless you are logged in to Wrangler. So the dev server
 * keeps remote bindings off (see the integration) and this plugin answers the AI route
 * itself, calling the Workers AI REST API with your Wrangler login. It only runs when
 * someone uses the sidebar: `pnpm dev` works exactly the same without a login.
 */
export function capsuloAiDevPlugin(ai: { enabled: boolean; model: string }): Plugin {
	let root = process.cwd();
	let credentials: Promise<Credentials> | null = null;

	function runWrangler(args: string[]): Promise<string> {
		const require = createRequire(path.join(root, "package.json"));
		const packageJson = require.resolve("wrangler/package.json");
		const bin = path.join(path.dirname(packageJson), "bin", "wrangler.js");
		return new Promise((resolve, reject) => {
			execFile(
				process.execPath,
				[bin, ...args],
				{ cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: "false" }, windowsHide: true, timeout: 30_000 },
				(error, stdout, stderr) =>
					error ? reject(new Error(`wrangler ${args.join(" ")} failed: ${stderr.trim() || error.message}`)) : resolve(stdout)
			);
		});
	}

	function parseJsonOutput(output: string): Record<string, unknown> {
		const start = output.indexOf("{");
		const end = output.lastIndexOf("}");
		if (start === -1 || end <= start) return {};
		try {
			return JSON.parse(output.slice(start, end + 1)) as Record<string, unknown>;
		} catch {
			return {};
		}
	}

	function configuredAccountId(): string | undefined {
		if (process.env.CLOUDFLARE_ACCOUNT_ID) return process.env.CLOUDFLARE_ACCOUNT_ID;
		// Saved by `capsulo deploy` when you pick an account.
		try {
			const state = JSON.parse(fs.readFileSync(path.join(root, ".capsulo", "project.json"), "utf8")) as {
				accountId?: unknown;
			};
			if (typeof state.accountId === "string" && state.accountId) return state.accountId;
		} catch {
			// No deploy yet.
		}
		return undefined;
	}

	async function loadCredentials(): Promise<Credentials> {
		let wranglerError: unknown;
		const token =
			process.env.CLOUDFLARE_API_TOKEN ??
			(await runWrangler(["auth", "token", "--json"]).then(
				(output) => parseJsonOutput(output).token,
				(error: unknown) => {
					wranglerError = error instanceof Error ? error.message : error;
					return undefined;
				}
			));
		if (typeof token !== "string" || !token) {
			throw loginRequired("You're not logged in to Cloudflare, or your login has expired.", wranglerError);
		}

		let accountId = configuredAccountId();
		if (!accountId) {
			const whoami = parseJsonOutput(await runWrangler(["whoami", "--json"]).catch(() => ""));
			const accounts = Array.isArray(whoami.accounts) ? (whoami.accounts as { id?: unknown }[]) : [];
			const first = accounts.find((account) => typeof account.id === "string");
			if (!first) {
				throw loginRequired("Could not find your Cloudflare account.");
			}
			accountId = first.id as string;
		}
		return { token, accountId };
	}

	/** Calls the model and returns the raw response once Cloudflare has accepted the request. */
	async function callModel(input: Record<string, unknown>): Promise<Response> {
		credentials ??= loadCredentials();
		let current: Credentials;
		try {
			current = await credentials;
		} catch (error) {
			credentials = null;
			throw error;
		}

		const response = await fetch(`${CLOUDFLARE_API}/accounts/${current.accountId}/ai/run/${ai.model}`, {
			method: "POST",
			headers: { Authorization: `Bearer ${current.token}`, "Content-Type": "application/json" },
			body: JSON.stringify(input)
		});
		if (!response.ok) {
			const payload = (await response.json().catch(() => null)) as { errors?: CloudflareError[] } | null;
			const errors = Array.isArray(payload?.errors) ? payload.errors : [];
			const detail = errors.map((error) => `${error.code ?? ""} ${error.message ?? ""}`.trim()).join("; ");
			if (isAuthFailure(response.status, errors)) {
				// Drop the cached token: the next request asks Wrangler again, so it picks up
				// a refreshed token or a new `wrangler login` without restarting the dev server.
				credentials = null;
				throw loginRequired("Cloudflare rejected your login: it has expired or is invalid.", `HTTP ${response.status} ${detail}`);
			}
			throw toAiRequestError(new Error(detail || `HTTP ${response.status}`));
		}
		return response;
	}

	async function runModel(input: Record<string, unknown>): Promise<unknown> {
		const payload = (await (await callModel(input)).json().catch(() => null)) as { result?: unknown } | null;
		if (!payload) throw toAiRequestError(new Error("The model returned an unreadable response."));
		return payload.result;
	}

	/** The route is authenticated like the real one: ask the app who the cookie belongs to. */
	async function isSignedIn(req: IncomingMessage): Promise<boolean> {
		const origin = `http://${req.headers.host ?? "localhost"}`;
		const response = await fetch(`${origin}/api/capsulo/auth/me`, {
			headers: { cookie: req.headers.cookie ?? "" }
		}).catch(() => null);
		if (!response?.ok) return false;
		const body = (await response.json().catch(() => null)) as { user?: unknown } | null;
		return Boolean(body?.user);
	}

	function readBody(req: IncomingMessage): Promise<string> {
		return new Promise((resolve, reject) => {
			let body = "";
			req.setEncoding("utf8");
			req.on("data", (chunk: string) => (body += chunk));
			req.on("end", () => resolve(body));
			req.on("error", reject);
		});
	}

	function send(res: ServerResponse, status: number, body: unknown): void {
		res.statusCode = status;
		res.setHeader("Content-Type", "application/json; charset=utf-8");
		res.setHeader("Cache-Control", "no-store");
		res.end(JSON.stringify(body));
	}

	return {
		name: "capsulo-ai-dev",
		apply: "serve",
		// Before the Cloudflare plugin, which would otherwise hand the route to workerd.
		enforce: "pre",
		configResolved(config) {
			root = config.root;
		},
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const route = AI_ROUTES[req.url?.split("?")[0] ?? ""];
				if (req.method !== "POST" || !route) return next();
				try {
					if (!(await isSignedIn(req))) return send(res, 401, { error: "Not signed in." });
					if (!ai.enabled) {
						throw new AiRequestError(404, "not-configured", "The AI agent is turned off in capsulo.config.ts.");
					}
					let body: unknown;
					try {
						body = JSON.parse(await readBody(req));
					} catch {
						throw new AiRequestError(400, "bad-request", "Request body must be valid JSON.");
					}
					const modelInput = route(body);
					const upstream = await callModel(modelInput({ stream: true }));
					if (!upstream.body) throw toAiRequestError(new Error("The model returned an empty response."));
					const events = toAiEventStream(upstream.body, () => runModel(modelInput()));

					res.statusCode = 200;
					res.setHeader("Content-Type", AI_STREAM_CONTENT_TYPE);
					res.setHeader("Cache-Control", "no-store");
					res.flushHeaders();
					const reader = events.getReader();
					// Stop pressed or tab closed: stop reading, which also stops the model.
					res.on("close", () => void reader.cancel().catch(() => {}));
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						res.write(value);
					}
					res.end();
				} catch (error) {
					const aiError = toAiRequestError(error);
					if (aiError.code === "model-error") console.error("[capsulo ai]", error);
					if (res.headersSent) return void res.end();
					send(res, aiError.status, { error: aiError.message, code: aiError.code });
				}
			});
		}
	};
}
