import capsuleDefinitionModules from "virtual:capsulo/capsules";
import type { CapsuleDefinition, RegisteredCapsule } from "./types";

type CapsuleModule = {
	default?: CapsuleDefinition;
	capsule?: CapsuleDefinition;
};

/** Every `capsule.definition.ts` in the site's capsules folder (see the integration's virtual modules). */
const capsuleModules = capsuleDefinitionModules as Record<string, CapsuleModule>;

function getFolderNameFromPath(filePath: string): string {
	const parts = filePath.split("/");
	const capsuleIndex = parts.lastIndexOf("capsules");
	return capsuleIndex >= 0 && parts[capsuleIndex + 1] ? parts[capsuleIndex + 1] : "unknown";
}

function getDefinition(modulePath: string, module: CapsuleModule): CapsuleDefinition {
	const definition = module.default ?? module.capsule;

	if (!definition) {
		throw new Error(
			`Capsule definition "${modulePath}" must export default defineCapsule(...) or \`capsule\`.`
		);
	}

	if (!definition.schema?.key) {
		throw new Error(`Capsule definition "${modulePath}" is missing schema.key.`);
	}

	if (!definition.component) {
		throw new Error(`Capsule definition "${modulePath}" is missing component.`);
	}

	return definition;
}

function buildRegistry(): RegisteredCapsule[] {
	const registered: RegisteredCapsule[] = [];
	const keySet = new Set<string>();

	for (const [modulePath, module] of Object.entries(capsuleModules)) {
		const definition = getDefinition(modulePath, module);
		const key = definition.schema.key;

		if (keySet.has(key)) {
			throw new Error(`Duplicate capsule schema key "${key}" found in "${modulePath}".`);
		}

		keySet.add(key);
		registered.push({
			...definition,
			key,
			folderName: getFolderNameFromPath(modulePath),
			sourcePath: modulePath
		});
	}

	return registered;
}

const capsuleRegistry = buildRegistry();

export function getAllCapsules(): RegisteredCapsule[] {
	return capsuleRegistry;
}

export function getCapsuleByKey(key: string): RegisteredCapsule | undefined {
	return capsuleRegistry.find((capsule) => capsule.key === key);
}
