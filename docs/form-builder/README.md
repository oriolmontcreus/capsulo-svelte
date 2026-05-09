# Form Builder System Guide

This document describes the **form-builder system contract** for this codebase:

- what the system is responsible for
- what must stay stable when refactoring
- how to safely add features and field types
- what to review before shipping changes

This is not a prototype demo guide. It is a maintenance and evolution reference.

---

## 1) System Purpose

The form-builder exists to define CMS editing UIs in a **declarative schema**, then render and validate them in a consistent way.

A schema is the source of truth for:

- what fields exist
- how they should be displayed
- how input should be validated
- how values should be collected and emitted

The schema should describe data fields, not page layout composition.

---

## 2) Non-Negotiable Design Invariants

These rules should be preserved unless there is a deliberate architectural migration:

1. **Flat fields output**
   - `schema.fields` must be directly iterable.
   - Renderer logic should not require layout-node interpretation.

2. **Discriminated union by `type`**
   - Every field definition must include a stable `type`.
   - Rendering and validation dispatch rely on this discriminator.

3. **Builder ergonomics with typed constraints**
   - Fluent builders provide autocomplete and prevent invalid config combinations.
   - Field-specific options belong to that field builder only.

4. **Separation of concerns**
   - Builder authoring != UI rendering != validation composition.
   - Avoid mixing these layers in one file.

5. **Predictable values shape**
   - Runtime output is a plain object map keyed by field name.
   - Consuming code should not need ad-hoc parsing.

---

## 3) System Architecture

### Authoring Layer

- `src/lib/form-builder/core/types.ts`
- `src/lib/form-builder/core/create-schema.ts`
- `src/lib/form-builder/schemas/*.ts`

Responsibilities:

- Define field unions and schema contracts.
- Build normalized schema objects from builders or plain field objects.
- Keep schema authoring explicit and type-safe.

### Field Modules

- `src/lib/form-builder/fields/<FieldName>/*.types.ts`
- `src/lib/form-builder/fields/<FieldName>/*.builder.ts`
- `src/lib/form-builder/fields/<FieldName>/*.field.svelte`
- `src/lib/form-builder/fields/<FieldName>/*.zod.ts`

Responsibilities:

- local field config and fluent API
- local UI component for that field
- local validation conversion for that field

### Runtime Rendering Layer

- `src/lib/form-builder/renderer/field-registry.ts`
- `src/lib/form-builder/renderer/SchemaRenderer.svelte`

Responsibilities:

- map `type -> field component`
- iterate `schema.fields`
- manage current values
- emit value updates upward

### Validation Composition Layer

- `src/lib/form-builder/core/schema-to-zod.ts`

Responsibilities:

- map each field definition to field-specific zod
- compose form-level schema (`z.object`)

---

## 4) Runtime Data Flow

1. A schema is authored with typed builders.
2. `createSchema(...)` outputs normalized `SchemaDefinition`.
3. `SchemaRenderer` loops through `schema.fields`.
4. Each field is resolved through `field-registry`.
5. Field components emit value updates.
6. Renderer updates and emits the aggregate values object.
7. Validation uses `schema-to-zod` + field zod mappers.

Key principle: rendering and validation are both derived from the same schema contract.

---

## 5) Safe Change Checklist (When Updating Form Builder)

Before merging any form-builder change, verify:

- **Schema contract unchanged intentionally**
  - No accidental rename of `type`, `name`, `fields`, or expected field metadata.
- **Renderer dispatch stays exhaustive**
  - New field types are wired in `field-registry`.
- **Validation path remains aligned**
  - New field type is mapped in `schema-to-zod`.
- **Output shape remains consumer-friendly**
  - Emitted values remain plain and predictable.
- **Backwards compatibility reviewed**
  - Existing schemas still render and validate as expected.
- **Type autocomplete not degraded**
  - Builder API still guides usage in editor IntelliSense.

---

## 6) How to Add a New Field Type (System Procedure)

Use this exact sequence:

1. Create field module files:
   - `*.types.ts`
   - `*.builder.ts`
   - `*.field.svelte`
   - `*.zod.ts`
2. Extend union types in `core/types.ts`.
3. Register visual component in `renderer/field-registry.ts`.
4. Register validation mapper in `core/schema-to-zod.ts`.
5. Add one schema example using the new field.
6. Verify values emission shape and zod behavior.

If any of those steps is skipped, the system becomes partially wired.

---

## 7) Common Failure Modes to Avoid

- Adding builder methods without updating field type definitions.
- Adding field `type` in types but forgetting renderer registry wiring.
- Rendering a new field but not mapping it in zod composition.
- Returning non-serializable objects in schema definitions.
- Embedding UI layout semantics into schema field data.
- Changing emitted values shape in renderer without updating consumers.

---

## 8) Maintenance Conventions

- Keep schema and builder files in `.ts` (not `.tsx`).
- Keep field UI rendering inside `*.field.svelte`.
- Keep validation rules close to field modules (`*.zod.ts`).
- Prefer additive changes over rewrites.
- Maintain clear folder boundaries by responsibility.

---

## 9) Current Implementation Scope

Current system implementation includes a minimal baseline:

- one field type (`text`)
- fluent builder
- registry-based renderer
- aggregated values emission
- minimal required validation with zod

This baseline is intentional: it is the reference contract to extend from.
