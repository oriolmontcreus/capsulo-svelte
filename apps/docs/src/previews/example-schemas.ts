import { createSchema } from '$lib/form-builder/core/create-schema';
import type { BuildableField, SchemaDefinition } from '$lib/form-builder/core/types';

type ExampleExport = BuildableField | BuildableField[] | SchemaDefinition;

// Kept apart from examples.ts (which also loads each file's source text) so the browser can
// build an example's schema itself: Astro serializes island props, which would drop the
// functions in `hidden()`/`required()` conditions.
const modules = import.meta.glob<ExampleExport>('/src/examples/**/*.ts', { eager: true, import: 'default' });

function isSchema(value: ExampleExport): value is SchemaDefinition {
  return typeof value === 'object' && value !== null && 'fields' in value && 'key' in value;
}

export function hasExample(name: string): boolean {
  return `/src/examples/${name}.ts` in modules;
}

export function loadExampleSchema(name: string, title: string): SchemaDefinition {
  const value = modules[`/src/examples/${name}.ts`];
  if (value === undefined) throw new Error(`Unknown example "${name}" (expected /src/examples/${name}.ts).`);
  return isSchema(value)
    ? { ...value, name: title }
    : createSchema({ name: title, key: name.replaceAll('/', '-'), fields: Array.isArray(value) ? value : [value] });
}
