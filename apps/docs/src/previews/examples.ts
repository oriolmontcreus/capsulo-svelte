import type { SchemaDefinition } from '$lib/form-builder/core/types';
import { hasExample, loadExampleSchema } from './example-schemas';

// Each example is one file in src/examples/<field>/<name>.ts. The preview runs the
// file's default export and the code dialog shows the same file, so they can't drift.
const sources = import.meta.glob<string>('/src/examples/**/*.ts', { eager: true, query: '?raw', import: 'default' });

const BUILDER_IMPORT = /^import \{ ([\w, ]+) \} from ['"]\$lib\/form-builder\/fields\/[^'"]+['"];\n/gm;

export interface Example {
  schema: SchemaDefinition;
  /** Code for the dialog: the builder call, with `// [!code word:…]` for the builder names. */
  code: string;
}

export function loadExample(name: string, title: string): Example {
  const path = `/src/examples/${name}.ts`;
  const source = sources[path];
  if (!hasExample(name) || source === undefined) throw new Error(`Unknown example "${name}" (expected ${path}).`);

  const schema = loadExampleSchema(name, title);

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
