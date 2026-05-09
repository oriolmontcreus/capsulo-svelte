import fs from "node:fs";
import path from "node:path";
import type { Plugin } from "vite";
import type { CapsuleManifest } from "$lib/capsules/core/types";

const VIRTUAL_MODULE_ID = "virtual:capsule-manifest";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;

const CAPSULES_ROOT = path.join("src", "components", "capsules");
const PAGES_ROOT = path.join("src", "pages");

function normalizeSlashes(value: string): string {
	return value.replaceAll("\\", "/");
}

function listFilesRecursive(dirPath: string): string[] {
	if (!fs.existsSync(dirPath)) {
		return [];
	}

	const output: string[] = [];
	const entries = fs.readdirSync(dirPath, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dirPath, entry.name);
		if (entry.isDirectory()) {
			output.push(...listFilesRecursive(fullPath));
			continue;
		}

		output.push(fullPath);
	}

	return output;
}

function getPageIdFromFile(filePath: string, pagesDir: string): string {
	const relativePath = normalizeSlashes(path.relative(pagesDir, filePath));
	const withoutExt = relativePath.replace(/\.astro$/, "");
	const withoutIndex = withoutExt.replace(/\/index$/, "");
	return withoutIndex === "index" || withoutIndex === "" ? "index" : withoutIndex;
}

function isPublicPage(filePath: string, pagesDir: string): boolean {
	const relativePath = normalizeSlashes(path.relative(pagesDir, filePath));
	const segments = relativePath.split("/");
	const fileName = segments[segments.length - 1] ?? "";

	if (segments.includes("api")) {
		return false;
	}

	if (segments.includes("admin") || fileName.startsWith("admin")) {
		return false;
	}

	return relativePath.endsWith(".astro");
}

function extractCapsuleFolder(importPath: string): string | undefined {
	const normalized = normalizeSlashes(importPath);
	const marker = "components/capsules/";
	const markerIndex = normalized.indexOf(marker);

	if (markerIndex === -1) {
		return undefined;
	}

	const afterMarker = normalized.slice(markerIndex + marker.length);
	const folder = afterMarker.split("/")[0];
	return folder || undefined;
}

function getSchemaKeyFromContent(schemaContent: string): string | undefined {
	const keyMatch = schemaContent.match(/key\s*:\s*["'`]([^"'`]+)["'`]/);
	return keyMatch?.[1];
}

function getCapsuleKeyByFolder(projectRoot: string): Map<string, string> {
	const capsulesRoot = path.join(projectRoot, CAPSULES_ROOT);
	const allFiles = listFilesRecursive(capsulesRoot);
	const definitionFiles = allFiles.filter((filePath) =>
		filePath.endsWith(path.join("", "capsule.definition.ts"))
	);

	const keyByFolder = new Map<string, string>();

	for (const definitionFile of definitionFiles) {
		const capsuleFolderPath = path.dirname(definitionFile);
		const folderName = path.basename(capsuleFolderPath);
		const schemaFiles = fs
			.readdirSync(capsuleFolderPath)
			.filter((fileName) => fileName.endsWith(".schema.ts") || fileName.endsWith(".schema.tsx"));

		if (schemaFiles.length === 0) {
			keyByFolder.set(folderName, folderName);
			continue;
		}

		const schemaPath = path.join(capsuleFolderPath, schemaFiles[0]);
		const schemaContent = fs.readFileSync(schemaPath, "utf8");
		const schemaKey = getSchemaKeyFromContent(schemaContent) ?? folderName;
		keyByFolder.set(folderName, schemaKey);
	}

	return keyByFolder;
}

function scanCapsuleManifest(projectRoot: string): CapsuleManifest {
	const pagesRoot = path.join(projectRoot, PAGES_ROOT);
	const pageFiles = listFilesRecursive(pagesRoot).filter((filePath) => isPublicPage(filePath, pagesRoot));
	const capsuleKeyByFolder = getCapsuleKeyByFolder(projectRoot);
	const manifest: CapsuleManifest = {};

	for (const pageFile of pageFiles) {
		const source = fs.readFileSync(pageFile, "utf8");
		const pageId = getPageIdFromFile(pageFile, pagesRoot);
		const frontmatterMatch = source.match(/^---\s*[\r\n]([\s\S]*?)\r?\n---/);
		const frontmatter = frontmatterMatch?.[1] ?? "";
		const templateContent = frontmatterMatch ? source.slice(frontmatterMatch[0].length) : source;

		const importedCapsules = new Map<string, { folder: string; key: string }>();
		const importRegex = /import\s+([A-Za-z_$][\w$]*)\s+from\s+["']([^"']+)["']/g;
		for (const match of frontmatter.matchAll(importRegex)) {
			const componentName = match[1];
			const importPath = match[2];
			const folder = extractCapsuleFolder(importPath);
			if (!folder) {
				continue;
			}

			importedCapsules.set(componentName, {
				folder,
				key: capsuleKeyByFolder.get(folder) ?? folder
			});
		}

		const usageCounts = new Map<string, number>();
		const tagRegex = /<([A-Z][A-Za-z0-9_]*)\b/g;
		for (const match of templateContent.matchAll(tagRegex)) {
			const tagName = match[1];
			if (!importedCapsules.has(tagName)) {
				continue;
			}

			usageCounts.set(tagName, (usageCounts.get(tagName) ?? 0) + 1);
		}

		const pageEntries = Array.from(importedCapsules.entries())
			.map(([componentName, capsuleRef]) => ({
				capsuleKey: capsuleRef.key,
				componentName,
				occurrenceCount: usageCounts.get(componentName) ?? 0
			}))
			.filter((entry) => entry.occurrenceCount > 0);

		if (pageEntries.length > 0) {
			manifest[pageId] = pageEntries;
		}
	}

	return manifest;
}

export function capsuleManifestPlugin(): Plugin {
	let projectRoot = process.cwd();
	let manifestCache: CapsuleManifest = {};

	function refreshManifest(): void {
		manifestCache = scanCapsuleManifest(projectRoot);
	}

	return {
		name: "capsule-manifest-plugin",
		enforce: "pre",
		configResolved(config) {
			projectRoot = config.root;
			refreshManifest();
		},
		buildStart() {
			refreshManifest();
		},
		resolveId(id) {
			if (id === VIRTUAL_MODULE_ID) {
				return RESOLVED_VIRTUAL_MODULE_ID;
			}
		},
		load(id) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				return `export default ${JSON.stringify(manifestCache, null, 2)};`;
			}
		},
		configureServer(server) {
			server.watcher.on("change", (changedPath) => {
				const normalized = normalizeSlashes(changedPath);
				const relevantPage = normalized.includes("/src/pages/") && normalized.endsWith(".astro");
				const relevantCapsuleDefinition = normalized.endsWith("/capsule.definition.ts");
				const relevantCapsuleSchema =
					normalized.includes("/src/components/capsules/") &&
					(normalized.endsWith(".schema.ts") || normalized.endsWith(".schema.tsx"));

				if (!relevantPage && !relevantCapsuleDefinition && !relevantCapsuleSchema) {
					return;
				}

				refreshManifest();
				const module = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
				if (module) {
					server.moduleGraph.invalidateModule(module);
				}
				server.ws.send({ type: "full-reload" });
			});
		}
	};
}
