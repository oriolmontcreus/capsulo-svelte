import type { SchemaDefinition } from "$lib/form-builder/core/types";

export interface CapsuleMeta {
	displayName?: string;
	description?: string;
}

export interface CapsuleDefinition<
	TSchema extends SchemaDefinition = SchemaDefinition,
	TComponent = unknown
> {
	schema: TSchema;
	component: TComponent;
	meta?: CapsuleMeta;
}

export interface RegisteredCapsule<
	TSchema extends SchemaDefinition = SchemaDefinition,
	TComponent = unknown
> extends CapsuleDefinition<TSchema, TComponent> {
	key: string;
	folderName: string;
	sourcePath: string;
}

export interface CapsuleManifestEntry {
	capsuleKey: string;
	componentName: string;
	occurrenceCount: number;
}

export type CapsuleManifest = Record<string, CapsuleManifestEntry[]>;
