import { createSchema } from '$lib/form-builder/core/create-schema';
import type { BuildableField, SchemaDefinition } from '$lib/form-builder/core/types';

type ExampleExport = BuildableField | BuildableField[] | SchemaDefinition;

// Each example is one file in src/examples/<field>/<name>.ts. The preview runs the
// file's default export and the code dialog shows the same file, so they can't drift.
const modules = import.meta.glob<ExampleExport>('/src/examples/**/*.ts', { eager: true, import: 'default' });
const sources = import.meta.glob<string>('/src/examples/**/*.ts', { eager: true, query: '?raw', import: 'default' });

const BUILDER_IMPORT = /^import \{ ([\w, ]+) \} from ['"]\$lib\/form-builder\/fields\/[^'"]+['"];\n/gm;

export interface Example {
  schema: SchemaDefinition;
  /** Code for the dialog: the builder call, with `// [!code word:…]` for the builder names. */
  code: string;
}

function isSchema(value: ExampleExport): value is SchemaDefinition {
  return typeof value === 'object' && value !== null && 'fields' in value && 'key' in value;
}

export function loadExample(name: string, title: string): Example {
  const path = `/src/examples/${name}.ts`;
  const value = modules[path];
  const source = sources[path];
  if (value === undefined || source === undefined) throw new Error(`Unknown example "${name}" (expected ${path}).`);

  const schema = isSchema(value)
    ? { ...value, name: title }
    : createSchema({ name: title, key: name.replaceAll('/', '-'), fields: Array.isArray(value) ? value : [value] });

  // The field page's "Usage" section shows the imports; the dialog shows the call itself,
  // like the old docs did. Other imports stay.
  const builders: string[] = [];
  const body = source
    .replace(BUILDER_IMPORT, (_, names: string) => {
      builders.push(...names.split(',').map((item) => item.trim()));
      return '';
    })
    .replace(/^import \{ createSchema \} from ['"][^'"]+['"];\n/m, '')
    .replace(/^export default /m, '')
    .trim();

  const marks = builders.map((builder) => `// [!code word:${builder}]\n`).join('');
  return { schema, code: marks + body };
}
