import path from "node:path";
import { readdir } from "node:fs/promises";
import { intro, log, outro, spinner } from "@clack/prompts";
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

function printSummary(context: string, summary: Awaited<ReturnType<typeof processSchemaBatch>>): void {
	for (const result of summary.results) {
		const shortPath = normalizeSlashes(path.relative(process.cwd(), result.filePath));
		if (result.status === "error") {
			log.error(`${context}: ${shortPath} failed - ${result.error.message}`);
			continue;
		}

		if (result.result === "written") {
			log.success(
				`${context}: ${shortPath} -> ${normalizeSlashes(path.relative(process.cwd(), result.outputPath))}`
			);
			continue;
		}

		log.info(`${context}: ${shortPath} unchanged`);
	}

	log.message(
		`${context} summary: processed=${summary.processed}, written=${summary.written}, skipped=${summary.skipped}, failed=${summary.failed}`
	);
}

export function schemaTypesPlugin(): Plugin {
	let projectRoot = process.cwd();
	let hasInitialized = false;
	let pendingSchemaPaths = new Set<string>();
	let debounceTimer: ReturnType<typeof setTimeout> | undefined;

	async function flush(label: string, server?: ViteDevServer) {
		const files = Array.from(pendingSchemaPaths);
		pendingSchemaPaths = new Set<string>();

		if (!files.length) {
			return;
		}

		const s = spinner();
		s.start(`${label}: processing ${files.length} schema file(s)...`);
		const summary = await processSchemaBatch(files);
		s.stop(`${label}: done`);
		printSummary(label, summary);

		if (summary.written > 0 && server) {
			server.ws.send({ type: "full-reload" });
		}
	}

	function scheduleFlush(label: string, server?: ViteDevServer) {
		if (debounceTimer) {
			clearTimeout(debounceTimer);
		}

		debounceTimer = setTimeout(() => {
			void flush(label, server);
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
				intro("Schema types watcher");
				const initialFiles = await discoverSchemaFiles(projectRoot);
				for (const file of initialFiles) {
					pendingSchemaPaths.add(file);
				}
				await flush("Startup");
				outro("Schema types watcher ready");
			}

			server.watcher.on("add", (filePath) => {
				if (!isCapsuleSchemaPath(filePath)) return;
				pendingSchemaPaths.add(filePath);
				scheduleFlush("Watch", server);
			});

			server.watcher.on("change", (filePath) => {
				if (!isCapsuleSchemaPath(filePath)) return;
				pendingSchemaPaths.add(filePath);
				scheduleFlush("Watch", server);
			});
		}
	};
}
