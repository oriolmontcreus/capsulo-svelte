import path from "node:path";
import { readdir } from "node:fs/promises";
import { log } from "@clack/prompts";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import { processSchemaBatch } from "./schema-types/generate-dts";
import { terminalGray, terminalOrange } from "../../lib/utils/terminal";

const SCHEMA_SUFFIX = ".schema.ts";
const CAPSULES_RELATIVE_ROOT = path.join("src", "components", "capsules");

function normalizeSlashes(input: string): string {
	return input.replaceAll("\\", "/");
}

async function walkFilesRecursive(targetDir: string): Promise<string[]> {
	const entries = await readdir(targetDir, { withFileTypes: true });
	const allPaths = await Promise.all(
		entries.map(async (entry) => {
			const fullPath = path.join(targetDir, entry.name);
			if (entry.isDirectory()) {
				return walkFilesRecursive(fullPath);
			}
			return [fullPath];
		})
	);

	return allPaths.flat();
}

async function discoverSchemaFiles(projectRoot: string): Promise<string[]> {
	const capsulesRoot = path.join(projectRoot, CAPSULES_RELATIVE_ROOT);
	try {
		const files = await walkFilesRecursive(capsulesRoot);
		return files.filter((filePath) => filePath.endsWith(SCHEMA_SUFFIX));
	} catch {
		return [];
	}
}

function isCapsuleSchemaPath(projectRoot: string, filePath: string): boolean {
	const capsulesRoot = `${normalizeSlashes(path.join(projectRoot, CAPSULES_RELATIVE_ROOT))}/`;
	return normalizeSlashes(filePath).startsWith(capsulesRoot) && filePath.endsWith(SCHEMA_SUFFIX);
}

function toProjectRelativePath(projectRoot: string, filePath: string): string {
	return normalizeSlashes(path.relative(projectRoot, filePath));
}

function printConciseMessages(projectRoot: string, summary: Awaited<ReturnType<typeof processSchemaBatch>>): void {
	for (const result of summary.results) {
		const shortPath = toProjectRelativePath(projectRoot, result.filePath);
		if (result.status === "error") {
			log.error(`Schema types failed ${terminalGray(shortPath)}`);
			continue;
		}

		if (result.result === "written") {
			const outputPath = toProjectRelativePath(projectRoot, result.outputPath);
			log.message(`${terminalOrange("Regenerated")} ${terminalGray(outputPath)}`);
		}
	}
}

export function schemaTypesPlugin(): Plugin {
	let projectRoot = process.cwd();
	let hasInitialized = false;
	let pendingSchemaPaths = new Set<string>();
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	async function flush(server?: ViteDevServer) {
		const files = Array.from(pendingSchemaPaths);
		pendingSchemaPaths = new Set<string>();

		if (!files.length) {
			return;
		}

		const summary = await processSchemaBatch(files);
		printConciseMessages(projectRoot, summary);

		if (summary.written > 0 && server) {
			server.ws.send({ type: "full-reload" });
		}
	}

	function scheduleFlush(server?: ViteDevServer) {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			void flush(server);
		}, 500);
	}

	return {
		name: "schema-types-plugin",
		apply: "serve",
		configResolved(config: ResolvedConfig) {
			projectRoot = config.root;
		},
		async configureServer(server: ViteDevServer) {
			const currentMaxListeners = server.watcher.getMaxListeners?.();
			if (typeof currentMaxListeners === "number" && currentMaxListeners < 30) {
				server.watcher.setMaxListeners(30);
			}

			if (!hasInitialized) {
				hasInitialized = true;
				const initialFiles = await discoverSchemaFiles(projectRoot);
				for (const file of initialFiles) {
					pendingSchemaPaths.add(file);
				}
				await flush();
				log.message("Schema types watcher ready");
			}

			server.watcher.on("add", (filePath: string) => {
				if (!isCapsuleSchemaPath(projectRoot, filePath)) return;
				pendingSchemaPaths.add(filePath);
				scheduleFlush(server);
			});

			server.watcher.on("change", (filePath: string) => {
				if (!isCapsuleSchemaPath(projectRoot, filePath)) return;
				pendingSchemaPaths.add(filePath);
				scheduleFlush(server);
			});
		}
	};
}
