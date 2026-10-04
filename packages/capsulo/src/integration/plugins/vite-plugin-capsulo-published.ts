import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";

const VIRTUAL_MODULE_ID = "virtual:capsulo/published";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
const SNAPSHOT_PATH = path.join(".capsulo", "published", "content.json");

/**
 * In `astro dev` prerendered pages render in Node while the API runs in workerd, so the
 * dev variant reads the local D1 through the dev server's own export endpoint.
 */
const DEV_MODULE = `
export async function loadPublishedContent(requestUrl) {
	const response = await fetch(new URL("/api/capsulo/export", requestUrl)).catch(() => null);
	if (!response || !response.ok) return { pages: {}, globals: null };
	const { pages = {}, globals = null } = await response.json();
	return { pages, globals };
}
`;

/**
 * Provides `virtual:capsulo/published` for the public pages:
 * - `astro dev`: reads the local D1 on every request, so commits show up after a reload.
 * - `astro build`: reads the snapshot written by `capsulo pull` (the "build" script runs it first).
 */
export function capsuloPublishedPlugin(): Plugin {
	let root = process.cwd();
	let command: "serve" | "build" = "serve";

	return {
		name: "capsulo-published-content",
		configResolved(config) {
			root = config.root;
			command = config.command;
		},
		resolveId(id) {
			return id === VIRTUAL_MODULE_ID ? RESOLVED_VIRTUAL_MODULE_ID : null;
		},
		load(id) {
			if (id !== RESOLVED_VIRTUAL_MODULE_ID) return null;
			if (command === "serve") return DEV_MODULE;

			const snapshotFile = path.join(root, SNAPSHOT_PATH);
			let snapshot = "{}";
			if (fs.existsSync(snapshotFile)) {
				this.addWatchFile(snapshotFile);
				snapshot = fs.readFileSync(snapshotFile, "utf8");
			} else {
				this.warn(`${SNAPSHOT_PATH} not found; public pages use schema defaults. Run \`capsulo pull\`.`);
			}
			const { pages = {}, globals = null } = JSON.parse(snapshot) as { pages?: object; globals?: unknown };
			return `const content = ${JSON.stringify({ pages, globals })};\nexport async function loadPublishedContent() { return content; }\n`;
		},
	};
}
