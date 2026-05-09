import path from "node:path";
import { readdir } from "node:fs/promises";
import { log } from "@clack/prompts";
import type { Plugin, ViteDevServer } from "vite";
import { processSchemaBatch } from "../../scripts/lib/schema-types/generate-dts";

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

function isCapsuleSchemaPath(filePath: string): boolean {
	const normalized = normalizeSlashes(filePath);
	return normalized.includes("/src/components/capsules/") && normalized.endsWith(SCHEMA_SUFFIX);
}

function orange(text: string): string {
	return `\x1b[38;5;208m${text}\x1b[0m`;
}

function gray(text: string): string {
	return `\x1b[38;5;245m${text}\x1b[0m`;
}

function toCapsulesRelativePath(filePath: string): string {
	const normalized = normalizeSlashes(path.relative(process.cwd(), filePath));
	const marker = "src/";
	const markerIndex = normalized.indexOf(marker);
	return markerIndex >= 0 ? normalized.slice(markerIndex) : normalized;
}

function printConciseMessages(summary: Awaited<ReturnType<typeof processSchemaBatch>>): void {
	for (const result of summary.results) {
		const shortPath = toCapsulesRelativePath(result.filePath);
		if (result.status === "error") {
			log.error(`Schema types failed ${gray(shortPath)}`);
			continue;
		}

		if (result.result === "written") {
			const outputPath = toCapsulesRelativePath(result.outputPath);
			log.message(`${orange("Regenerated")} ${gray(outputPath)}`);
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
		printConciseMessages(summary);

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
		configResolved(config) {
			projectRoot = config.root;
		},
		async configureServer(server) {
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

			server.watcher.on("add", (filePath) => {
				if (!isCapsuleSchemaPath(filePath)) return;
				pendingSchemaPaths.add(filePath);
				scheduleFlush(server);
			});

			server.watcher.on("change", (filePath) => {
				if (!isCapsuleSchemaPath(filePath)) return;
				pendingSchemaPaths.add(filePath);
				scheduleFlush(server);
			});
		}
	};
}
