import type { CapsuleDefinition } from "./types";

export function defineCapsule<TDefinition extends CapsuleDefinition>(
	definition: TDefinition
): TDefinition {
	if (!definition?.schema?.key) {
		throw new Error("Invalid capsule definition: `schema.key` is required.");
	}

	if (!definition.component) {
		throw new Error(
			`Invalid capsule definition for "${definition.schema.key}": component is required.`
		);
	}

	return definition;
}
