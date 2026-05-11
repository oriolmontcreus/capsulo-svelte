# Capsule Auto-Detection System Guide

This document explains how the capsule auto-detection prototype works, what responsibilities each part has, and which constraints are important for future iterations.

## Purpose

The system automatically detects capsule usage in public Astro pages and exposes that information to the admin prototype so editors can fill form fields per detected instance.

Current prototype scope:

- auto-register capsules through a required `capsule.definition.ts`
- scan public pages and build a virtual manifest
- render form instances in admin from the manifest and schema definitions
- keep state in-memory only (no persistence yet)

## Architecture Overview

The flow is:

1. A capsule is defined in `src/components/capsules/<CapsuleName>/`.
2. Each capsule must export `defineCapsule(...)` in `capsule.definition.ts`.
3. The capsule registry loads all definitions with `import.meta.glob(..., { eager: true })`.
4. A Vite plugin scans public `.astro` pages and generates `virtual:capsule-manifest`.
5. Admin route imports that virtual manifest and renders forms through `SchemaRenderer`.

## Main Files and Responsibilities

- `src/lib/capsules/core/types.ts`
  - Shared contracts: `CapsuleDefinition`, `RegisteredCapsule`, `CapsuleManifest`.
- `src/lib/capsules/core/define-capsule.ts`
  - Minimal runtime guard for capsule definitions.
- `src/lib/capsules/core/registry.ts`
  - Loads and validates all capsule definitions.
  - Enforces unique schema keys.
- `src/lib/vite-plugin-capsule-manifest.ts`
  - Scans public pages and builds `virtual:capsule-manifest`.
  - Tracks `occurrenceCount` per imported capsule component.
- `src/pages/capsule-prototype.astro`
  - Public page used to validate detection with repeated capsule instances.
- `src/pages/admin-capsules-prototype.astro`
  - Admin prototype page that consumes the generated manifest.
- `src/lib/capsules/admin/CapsuleAutoDetectionPrototype.svelte`
  - Simple UI that maps detected entries to schemas and renders one form per instance.

## Capsule Contract (Required)

Each capsule folder must contain:

- `capsule.definition.ts` (required)
- one schema file (`*.schema.ts` or `*.schema.tsx`)
- visual component (`.astro` or `.svelte`)
- local types (`*.types.ts`) if needed

The registry expects at least:

- `schema.key` (non-empty)
- `component` reference
- unique `schema.key` across all capsules

## Manifest Model

`virtual:capsule-manifest` returns:

`Record<pageId, ManifestEntry[]>`

Where each `ManifestEntry` contains:

- `capsuleKey`
- `componentName`
- `occurrenceCount`

Only entries with `occurrenceCount > 0` are included.

## Important Behavior in the Admin Prototype

- Page chips are generated from manifest keys.
- Selected page entries are rendered in cards.
- For each entry, the UI renders N forms (`N = occurrenceCount`).
- Form values are kept in local memory by `instanceId`.
- There is no save/load path yet; reload resets values.

## Important Constraints for the Future

1. **Keep `capsule.definition.ts` mandatory**
   - This keeps registration deterministic and avoids fragile heuristics.

2. **Do not duplicate key sources**
   - Treat `schema.key` as the canonical identity.
   - Any future metadata should derive or validate against it.

3. **Preserve separation of responsibilities**
   - Registration logic should stay in capsules core.
   - Page scanning should stay in the Vite plugin.
   - Admin rendering should not include scanning logic.

4. **Be careful with page ID normalization**
   - Keep one shared page ID convention before introducing nested/dynamic CMS routes.

5. **Scanner limitations are expected in prototype**
   - Import and tag detection currently use regex-based heuristics.
   - If complexity grows (aliases, wrappers, advanced import patterns), migrate scanner parsing to AST.

6. **Instance identity must become stable before persistence**
   - Current prototype uses index-based instance IDs.
   - Before implementing save/load, define a stable strategy for reorder-safe IDs.

7. **Add validation gates before scaling**
   - CI checks for duplicate keys, missing definitions, and broken schema/component links should be introduced early.

## Recommended Next Steps

- Add persistence layer (save/load page data).
- Introduce stable per-instance IDs.
- Add scanner tests for nested routes and import edge cases.
- Add capsule creation CLI template including `capsule.definition.ts`.
- Add migration/version fields in capsule metadata for long-term compatibility.
