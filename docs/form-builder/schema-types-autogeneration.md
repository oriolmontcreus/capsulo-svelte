# Schema Types Autogeneration

This document describes how schema type generation works in the current project and which constraints should be preserved as the system evolves.

## Scope

The watcher targets:

- `src/components/capsules/**/*.schema.ts`

For each schema file, it generates:

- `*.schema.d.ts`

This phase does **not** patch component `.astro` files.

## Runtime Flow

The generation flow runs automatically during `pnpm run dev` through a Vite plugin.

1. Dev server starts.
2. Plugin scans all capsule schema files.
3. Each file is parsed and converted into TypeScript interfaces.
4. Output content is compared with existing `.d.ts`.
5. File is written only when content changed.
6. During watch mode, updates are batched with a `500ms` debounce window.

## Safety Guarantees

- Processing is **per-file safe**:
  - one schema failure does not stop successful files from generating.
- No partial writes:
  - generation happens in memory first.
  - file writes use temp file + rename.
- No noisy rewrites:
  - unchanged content is skipped.

## Console Feedback

The watcher uses `@clack/prompts` to show:

- startup/ready states
- per-file result (`written`, `unchanged`, `error`)
- batch summary counters (`processed`, `written`, `skipped`, `failed`)

## Parser Contract (Current)

The parser currently reads `createSchema({ ... })` definitions and extracts:

- schema display name
- schema key
- fields from the `fields` array
- required/default flags from fluent builder chains

Field builder TS type mapping is explicit and currently includes:

- `TextField` -> `string`

Unknown builders fallback to `any`.

## Important Maintenance Rules

1. Keep watcher root aligned with capsule architecture (`src/components/capsules`).
2. Keep debounce at `500ms` unless there is measured evidence to change it.
3. Preserve write-if-changed behavior to avoid watcher loops and noisy diffs.
4. Extend builder-to-type mapping whenever new field builders are introduced.
5. Keep generation logic reusable and isolated from Vite-specific wiring.

## Known Limitations

- Only `.schema.ts` files are watched in this phase.
- Complex schema abstractions outside direct `createSchema({ fields: [...] })` patterns may require parser extensions.
- No `.astro` typing patching is performed yet (intentional for reduced coupling).
