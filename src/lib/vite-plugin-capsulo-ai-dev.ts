import { execFile } from "node:child_process";
import fs from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import type { Plugin } from "vite";

import { AI_ENABLED, AI_MODEL } from "./ai/config";
import { AiRequestError, buildModelInput, parseAiRequestBody, toAiRequestError } from "./ai/protocol";
import { AI_STREAM_CONTENT_TYPE, toAiEventStream } from "./ai/stream";

const AI_ROUTE = "/api/capsulo/ai";
/** Same override Wrangler honours, e.g. for a proxy or a test double. */
const CLOUDFLARE_API = process.env.CLOUDFLARE_API_BASE_URL ?? "https://api.cloudflare.com/client/v4";
const LOGIN_HINT = "Run `npx wrangler login` in the project folder, then send your message again.";

type Credentials = { token: string; accountId: string };

/**
 * Workers AI has no local simulator: its binding always calls Cloudflare, and with it
 * `astro dev` refuses to start unless you are logged in to Wrangler. So the dev server
 * keeps remote bindings off (astro.config.mjs) and this plugin answers the AI route
 * itself, calling the Workers AI REST API with your Wrangler login. It only runs when
 * someone uses the sidebar: `pnpm dev` works exactly the same without a login.
 */
export function capsuloAiDevPlugin(): Plugin {
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
				(error, stdout) => (error ? reject(error) : resolve(stdout))
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
		const token =
			process.env.CLOUDFLARE_API_TOKEN ??
			(await runWrangler(["auth", "token", "--json"]).then(
				(output) => parseJsonOutput(output).token,
				() => undefined
			));
		if (typeof token !== "string" || !token) {
			throw new AiRequestError(401, "dev-login-required", `The AI agent needs a Cloudflare login in local dev. ${LOGIN_HINT}`);
		}

		let accountId = configuredAccountId();
		if (!accountId) {
			const whoami = parseJsonOutput(await runWrangler(["whoami", "--json"]).catch(() => ""));
			const accounts = Array.isArray(whoami.accounts) ? (whoami.accounts as { id?: unknown }[]) : [];
			const first = accounts.find((account) => typeof account.id === "string");
			if (!first) {
				throw new AiRequestError(401, "dev-login-required", `Could not find your Cloudflare account. ${LOGIN_HINT}`);
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

		const response = await fetch(`${CLOUDFLARE_API}/accounts/${current.accountId}/ai/run/${AI_MODEL}`, {
			method: "POST",
			headers: { Authorization: `Bearer ${current.token}`, "Content-Type": "application/json" },
			body: JSON.stringify(input)
		});
		if (response.status === 401 || response.status === 403) {
			// Wrangler's OAuth token expires after an hour; the next request fetches a fresh one.
			credentials = null;
			throw new AiRequestError(401, "dev-login-required", `Cloudflare rejected the login. ${LOGIN_HINT}`);
		}
		if (!response.ok) {
			const payload = (await response.json().catch(() => null)) as { errors?: { code?: number; message?: string }[] } | null;
			const detail = payload?.errors?.map((error) => `${error.code ?? ""} ${error.message ?? ""}`.trim()).join("; ");
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
				if (req.method !== "POST" || req.url?.split("?")[0] !== AI_ROUTE) return next();
				try {
					if (!(await isSignedIn(req))) return send(res, 401, { error: "Not signed in." });
					if (!AI_ENABLED) {
						throw new AiRequestError(404, "not-configured", "The AI agent is turned off in capsulo.config.ts.");
					}
					let body: unknown;
					try {
						body = JSON.parse(await readBody(req));
					} catch {
						throw new AiRequestError(400, "bad-request", "Request body must be valid JSON.");
					}
					const request = parseAiRequestBody(body);
					const upstream = await callModel(buildModelInput(request, { stream: true }));
					if (!upstream.body) throw toAiRequestError(new Error("The model returned an empty response."));
					const events = toAiEventStream(upstream.body, () => runModel(buildModelInput(request)));

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
