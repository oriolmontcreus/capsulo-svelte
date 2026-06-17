# Changes Page — Implementation Plan

> Goal: replace the current manual "Save" button with a **commit-style workflow**.
> Edits already auto-sync to the user's local IndexedDB. A dedicated **Changes page**
> lets the user review a per-component diff (old vs new), revert individual fields,
> write a commit message, and **commit** everything to Supabase — which also records
> an immutable history entry (date/time, author, message) for a future History page.
>
> This mirrors the legacy git-based CMS (`capsulo-bunker`) but uses Supabase + IndexedDB
> instead of pure `.git`.

---

## 0. Context & Findings

### 0.1 How the legacy system worked (`capsulo-container/capsulo-bunker`)

| Concern | Legacy mechanism |
| --- | --- |
| Local autosave | Edits written to **IndexedDB drafts** (`idb-storage.ts`, store `drafts`). No manual save during editing. |
| "What changed" sidebar | `useChangesDetection.ts` listed pages/globals whose **draft differs from remote**. |
| Diff rendering | `DiffView.tsx` walked the **component schema** and rendered each *changed* field using the **real read-only field component**. Text/textarea fields used an **inline word diff** (`diffMode` + `diffOldValue`); non-text fields (toggle/select/color/file) used **side-by-side** "Previous / New". |
| Per-field actions | **Undo** (revert one field to its previous value, writes back into the draft) and **Recover** (history view variant). |
| Commit box | `CommitForm.tsx` — textarea (72 char) + "Generate with AI" + "Commit changes". |
| Commit target | `batch-save` API → **atomic git commit** of all changed pages + globals to a `draft` branch, with the message. Recent commit messages read from the GitHub API. |
| Remote baseline | `fetchRemotePageData()` compared the local draft against the git `draft` branch (fallback `main`). |

Key insight: the diff was **schema-aware**, not a raw JSON dump. That is what made it readable. The "old" side came from the remote (last committed) state; the "new" side from the local draft.

### 0.2 How the current system works (`capsulo-svelte`)

| Concern | Current mechanism | File |
| --- | --- | --- |
| Local autosave | Edits debounced 250ms into **IndexedDB** (`page-editor-cache`, store `documents`, key `pageId`). `updatedAt: null` marks unsaved-local. | `src/lib/PageEditor/page-editor-cache.ts`, `…/ContentSidebar/content-sidebar-document.svelte.ts` |
| Manual save | "Save" button → `savePageEditorDocument()` → `flushPendingUploads()` → `savePageEditorDocumentToDb()`. | `…/content-sidebar-document.svelte.ts`, `src/lib/PageEditor/page-editor-documents.ts` |
| DB write | `upsert` into **`pages`** + `insert` snapshot into **`pages-history`**. | `page-editor-documents.ts` |
| Content shape | `{ formatVersion: 1, instances: [{ id, values }] }`; `values` = `Record<fieldName, Partial<Record<locale, value>>>`. | `src/lib/PageEditor/persistence.ts` |
| Schema model | `SchemaDefinition { name, key, fields: FieldDefinition[] }`; `FieldType` = text \| textarea \| rich-editor \| toggle \| select \| colorpicker \| file-upload. | `src/lib/form-builder/core/types.ts` |
| Field components | Read-only-capable Svelte field components rendered by `SchemaRenderer`. | `src/lib/form-builder/renderer/SchemaRenderer.svelte`, `…/fields/**` |
| Capsules on a page | Build-time manifest `virtual:capsule-manifest` → instance ids like `test-capsule-01`. | `src/lib/PageEditor/ContentSidebar/capsule-instances.ts` |
| Admin shell / nav | `AdminLayout.astro` + `AdminNav.svelte`; routes: `page-editor`, `globals`. | `src/layouts/AdminLayout.astro`, `src/lib/admin/AdminNav.svelte` |
| Auth | `session` store (Supabase SSR browser client). | `src/lib/stores/session.ts`, `src/db/supabase.ts` |
| Globals | Save **directly** to `globals` table; **no IndexedDB draft, no history**. | `src/lib/globals/globals-documents.ts` |

### 0.3 Supabase schema today (verified live)

```
pages           page_id (pk) · content jsonb · content_format_version · created_by · updated_by · created_at · updated_at
pages-history   id (identity pk) · page_id (fk → pages, ON DELETE CASCADE) · content jsonb · content_format_version
                · comment text (NULLABLE, currently UNUSED) · created_by (fk → auth.users) · created_at
                index (page_id, created_at DESC) · RLS: SELECT + INSERT for authenticated, no UPDATE/DELETE (immutable)
globals         id='globals' (pk) · content jsonb · … (no history table)
```

**Assessment of the current `pages-history` approach** (the user asked us to evaluate it):

✅ **What is already right and should be kept**
- Immutable append-only log (no UPDATE/DELETE policy) — correct for an audit/history trail.
- Full snapshot per revision (not deltas) — simplest, lets the future History page diff any two revisions trivially. Storage cost is negligible for CMS-sized JSON.
- `content_format_version`, `created_by`, indexed `(page_id, created_at DESC)` — solid.
- A `comment` column already exists — we just need to start writing the commit message into it.

⚠️ **What needs to change for the commit workflow**
1. **Commit message is never written.** Today `pages-history.insert` omits `comment`. The whole point of the Changes page is to capture it. → must pass the message through.
2. **A snapshot is inserted on every save even when nothing changed.** With a deliberate "commit" action this is acceptable, but we should guard against committing pages with no diff (don't write empty/duplicate revisions).
3. **No grouping across pages.** The Changes page lists *several* changed pages and commits them under *one* message. With the current schema each page becomes an independent row, so the future History page cannot show "this commit touched pages A, B, C" as a unit. → **Recommended: introduce a lightweight grouping** (see Phase 5). We scope globals out for now per decision, but page-level grouping is still needed because a single commit can span multiple pages.
4. **`ON DELETE CASCADE`** means deleting a page erases its history. For an audit log this is debatable; flagged as a follow-up, not blocking.
5. **Security advisors** flagged `USING (true)` / `WITH CHECK (true)` RLS on `pages`, `pages-history`, `globals`. Out of scope for this feature, noted for a hardening pass.

**Recommendation (commit granularity):** keep `pages-history` as the per-page snapshot store, and add an optional **`commits` parent table** + `commit_id` FK on `pages-history`. A commit groups 1..N page snapshots under one message/author/timestamp. This is the smallest change that (a) preserves everything already working, (b) writes the commit message, and (c) makes the future grouped History page possible. If you'd rather defer grouping, Phase 5 can be reduced to "just write `comment`" — but you'll lose the grouped-commit view later.

### 0.4 Chosen approach (from clarifying answers)

- **Scope:** **Pages first.** Globals join the workflow in a later phase (Phase 7), not now.
- **Per-field granularity:** **Yes** — replicate legacy per-field revert.
- **Diff style:** **Schema-aware** — reuse the real read-only field components; word-level inline diff for text/textarea via `diff` (jsdiff); side-by-side for the rest. Use `microdiff` to detect changed paths.
- **Commit model:** evaluate & evolve `pages-history` (see Phase 5 + recommendation above).

### 0.5 Dependencies to add

| Package | Size | Use |
| --- | --- | --- |
| [`microdiff`](https://github.com/AsyncBanana/microdiff) | <1kb, zero-dep | Fast structural diff of old vs new `values` to detect which instances/fields/locales changed. |
| [`diff`](https://www.npmjs.com/package/diff) (jsdiff, v9) | ~6kb gz | `diffWords()` for inline word-level highlighting inside text/textarea field diffs. |

> Lazy-dev note: `microdiff` is optional — we can hand-roll a recursive change check over the known `values` shape since it is small and well-typed. We still recommend `microdiff` because the shape includes nested locale maps and arrays (select multi, file-upload) where a tested differ avoids edge-case bugs. `diff` is worth the 6kb because reimplementing Myers word-diff correctly is not lazy, it's risky.

---

## Phase 1 — Baseline diff infrastructure (no UI yet)

**Objective:** be able to compute, in memory, the difference between a page's *committed* (remote) content and its *local draft*, expressed per instance / field / locale.

1. Add deps: `pnpm add microdiff diff` (+ `@types/diff` if needed; jsdiff v9 ships types).
2. Create `src/lib/PageEditor/changes/diff-model.ts`:
   - Types: `FieldChange { instanceId, fieldName, locale, oldValue, newValue, kind: 'added'|'removed'|'changed' }`, `InstanceChange { instanceId, capsuleKey, isNew, fields: FieldChange[] }`, `PageChangeSet { pageId, instances: InstanceChange[] }`.
   - `computePageChangeSet(oldValues, newValues, schemaByInstance)` — normalizes empty-ish values (port `normalizeForComparison` from legacy `utils.ts`), walks instances → fields → locales, returns only real changes.
   - `pageHasChanges(changeSet)` helper (drives sidebar list, mirrors legacy `hasVisibleContentDiff`).
3. **Check (required):** `src/lib/PageEditor/changes/diff-model.test-manual.ts` — a tiny assert-based self-check (no framework) covering: unchanged → empty; text change in one locale; new instance; toggle false→true; emptied field (`""`/`null` treated as no-op). Runnable with `node --experimental-strip-types` or `tsx`.

**Deliverable:** a pure, tested function that turns (old, new) into a `PageChangeSet`. No Supabase, no Svelte.

---

## Phase 2 — "Committed baseline" + dirty tracking in IndexedDB

**Objective:** the diff needs an *old* side. The old side = the last content the user committed (i.e. last known remote `pages.content`). We must store that baseline locally so the Changes page works without refetching every page.

Today the cache stores only the current draft (`valuesByInstance` + `updatedAt`). We need both the draft **and** the committed baseline.

1. Extend `PageEditorCachedDocument` (`persistence.ts`) with `baselineValuesByInstance` (the last committed snapshot) alongside the live `valuesByInstance`. Bump `page-editor-cache` DB version 1 → 2 with an `onupgradeneeded` migration that backfills `baseline = current` for existing rows.
2. Update `content-sidebar-document.svelte.ts`:
   - On **remote load / sync**, set `baseline = remote content` (this is the committed truth).
   - On **local edit autosave** (the 250ms effect), keep `baseline` untouched; only update `valuesByInstance` + `updatedAt: null`. → draft drifts from baseline = "dirty".
   - After a **successful commit** (Phase 4), set `baseline = committed values`.
3. Add `src/lib/PageEditor/changes/changed-pages.ts`:
   - `listChangedPages()` — iterate all cache rows, run `computePageChangeSet(baseline, current)`, return pages with real changes (`{ pageId, name, count }`).
   - This replaces the legacy `getChangedPageIds()` + remote-compare loop, but is **purely local** (no per-page network calls — faster than legacy).

**Deliverable:** local store knows, for every page, its committed baseline and whether it's dirty.

> Design note: keeping the baseline locally (vs refetching remote each time, as legacy did against the git branch) is faster and works offline. Trade-off: if another user commits the same page elsewhere, our baseline is stale until the next remote sync — acceptable for a single-editor CMS; revisit if multi-editor becomes a concern (Phase 8 idea: compare against remote `updated_at` and warn).

---

## Phase 3 — Diff renderer components (schema-aware)

**Objective:** port legacy `DiffView` to Svelte 5, reusing existing field components.

1. `src/lib/PageEditor/changes/InlineTextDiff.svelte` — given `oldText`/`newText`, render `diffWords()` output with added (green) / removed (red strike) spans. Pure presentational.
2. `src/lib/PageEditor/changes/FieldDiff.svelte` — for one `FieldChange`:
   - text / textarea → `InlineTextDiff` (per locale row, locale badge for non-default).
   - rich-editor → side-by-side read-only render (no inline diff — would destroy markup, same call legacy made).
   - toggle / select / colorpicker / file-upload → side-by-side "Previous / New" using the real read-only field component (`SchemaRenderer` field in a disabled/readonly mode).
   - Hover **Revert** button (Phase 6 wires the handler).
3. `src/lib/PageEditor/changes/InstanceDiff.svelte` — header (capsule name + "New" badge if instance didn't exist in baseline) + list of `FieldDiff` for changed fields only.
4. `src/lib/PageEditor/changes/PageDiff.svelte` — maps a `PageChangeSet` to `InstanceDiff`s; empty state "No changes to display".

> Reuse check: confirm the field components accept a read-only/disabled prop. If not, the smallest change is a `readonly` prop on the shared field wrapper rather than new bespoke renderers. Prefer extending existing components over duplicating them (ponytail).

**Deliverable:** given a `PageChangeSet` + schemas, render a readable, schema-aware diff.

---

## Phase 4 — Changes page shell + commit-to-Supabase (pages, single message)

**Objective:** the actual `/admin/changes` route: sidebar of changed pages, main diff pane, commit box; committing writes to Supabase with the message.

1. Route: `src/pages/admin/changes.astro` (under `AdminLayout`) + add "Changes" item to `AdminNav.svelte` (`AdminRoute` union). Optionally show a badge with the dirty-page count.
2. `src/lib/PageEditor/changes/ChangesPage.svelte`:
   - Left: `ChangesSidebar.svelte` (list from `listChangedPages()`, selection state) + `CommitForm.svelte` (textarea, char counter; AI generation deferred/omitted — legacy had it but it's optional).
   - Right: `PageDiff.svelte` for the selected page.
3. Commit handler `src/lib/PageEditor/changes/commit.ts`:
   - For each changed page: `flushPendingUploads()` (file fields), then write via the **revised** `savePageEditorDocumentToDb` (Phase 5) passing the `comment`.
   - Guard: skip pages whose change set is empty.
   - On success: update each page's cache `baseline = committed values`, `updatedAt = remote`, clear the commit message, refresh the sidebar (now empty → "No changes").
   - Surface partial failures (page A saved, page B failed) clearly; do not lose the message.
4. Remove / relocate the per-page **Save button** in `PageEditor.svelte`:
   - Replace with a passive status ("All changes saved locally · N pending") + link to `/admin/changes`. Editing no longer hits Supabase directly; only committing does.

**Deliverable:** end-to-end — edit → auto local → review diff → write message → commit → Supabase `pages` + `pages-history` updated, message stored, baseline reset.

---

## Phase 5 — Evolve `pages-history` for proper commits (DB)

**Objective:** make history correct for the new workflow and the future History page. Apply via `apply_migration` (Supabase MCP) + mirror SQL into `supabase/migrations` & `supabase/tables`.

1. **Always write `comment`** with the commit message (smallest fix; do this even if grouping is deferred).
2. **Add grouping (recommended):**
   - New table `public.commits`: `id uuid pk default gen_random_uuid()`, `message text not null`, `created_by uuid → auth.users`, `created_at timestamptz default now()`. RLS: authenticated SELECT + INSERT, no UPDATE/DELETE (immutable).
   - Add `commit_id uuid` (nullable for backfill) to `pages-history` → FK `commits(id)`. Index `(commit_id)`.
   - Commit flow: insert one `commits` row, then insert each page snapshot with that `commit_id` + `comment`.
3. **Don't duplicate empty revisions:** only insert a history row when the page actually changed (enforced in app; optionally a trigger comparing against the latest `pages.content`).
4. Provide a read function (used by future History page, stubbed now): `loadCommits()` / `loadCommitPages(commitId)`.
5. Optionally generate fresh TS types via `generate_typescript_types` and wire them in.

> If you decide to **defer grouping**: implement only step 1 + 3. The Changes page still works; the future History page just lists per-page revisions instead of grouped commits. Grouping can be added later without data loss (backfill `commit_id` null).

**Deliverable:** Supabase records who/when/what-message for each commit, grouped across the pages it touched.

---

## Phase 6 — Per-field revert (Undo)

**Objective:** restore legacy per-field "revert to previous value".

1. `revertField(pageId, change)` in `changed-pages.ts`: write `change.oldValue` (the baseline value) back into the **draft** `valuesByInstance` for that instance/field/locale, persist to cache (`updatedAt: null`), and notify the editor store so an open editor reflects it.
2. Wire the **Revert** button in `FieldDiff.svelte` to `revertField`; re-run the page's change set (the row disappears when reverted).
3. Edge cases: reverting a field on a **new** instance (baseline missing) means removing that field/instance from the draft; handle "instance fully reverted → drop from change set".
4. **Check:** extend the Phase 1 manual self-check with a revert round-trip (change → revert → change set empty).

**Deliverable:** users can discard individual field changes without leaving the Changes page.

---

## Phase 7 — Globals into the workflow (deferred scope)

> Only after pages flow is solid. Brings globals to parity.

1. Add an IndexedDB baseline+draft cache for globals (reuse `page-editor-cache` with a reserved key `globals`, or a sibling store).
2. Make `GlobalsEditor` autosave to that cache instead of saving directly to Supabase; surface globals in `listChangedPages()` as a pseudo-entry.
3. Create `globals-history` table mirroring `pages-history` (+ `commit_id` so a commit can span pages **and** globals, like legacy git did).
4. Update commit flow to include globals in the same `commits` row.

**Deliverable:** globals reviewed/committed exactly like pages.

---

## Phase 8 — Polish & follow-ups (optional)

- "Discard all changes for this page" / "Discard all" (clears draft back to baseline).
- Dirty-count badge in `AdminNav`; unsaved-changes indicator.
- Stale-baseline guard: on commit, compare remote `updated_at` to detect concurrent edits and warn before overwriting.
- AI commit-message generation (legacy `CommitForm` feature) if desired.
- Security hardening pass for the `USING (true)` RLS advisors on `pages` / `pages-history` / `globals`.
- Reconsider `ON DELETE CASCADE` on `pages-history` if history must survive page deletion.
- Future **History page** (the payoff): list `commits`, open one to see grouped page diffs (reuse `PageDiff`), and a per-field **Recover** action (legacy `onRecoverField`) to pull an old value into the current draft.

---

## File map (new / touched)

```
NEW  src/pages/admin/changes.astro
NEW  src/lib/PageEditor/changes/
        diff-model.ts                 (Phase 1)
        diff-model.test-manual.ts     (Phase 1 check)
        changed-pages.ts              (Phase 2, 6)
        InlineTextDiff.svelte         (Phase 3)
        FieldDiff.svelte              (Phase 3, 6)
        InstanceDiff.svelte           (Phase 3)
        PageDiff.svelte               (Phase 3)
        ChangesPage.svelte            (Phase 4)
        ChangesSidebar.svelte         (Phase 4)
        CommitForm.svelte             (Phase 4)
        commit.ts                     (Phase 4)
EDIT src/lib/PageEditor/persistence.ts            (+ baseline field, cache v2)
EDIT src/lib/PageEditor/page-editor-cache.ts      (DB v1→v2 migration)
EDIT src/lib/PageEditor/ContentSidebar/content-sidebar-document.svelte.ts (baseline tracking; remove direct save)
EDIT src/lib/PageEditor/page-editor-documents.ts  (accept + write `comment`/`commit_id`)
EDIT src/lib/PageEditor.svelte                    (replace Save button with status + link)
EDIT src/lib/admin/AdminNav.svelte                (add "Changes" route)
DB   supabase migration: write comment + commits table + commit_id (Phase 5)
DEPS microdiff, diff (jsdiff)
```

## Open questions / assumptions

- **Commit granularity** left to us → plan recommends a `commits` parent table for grouping; can be reduced to "write `comment` only" if you prefer minimal DB change now.
- Assumes field components can render **read-only** (verify in Phase 3; add a `readonly` prop if missing).
- Assumes single-editor usage (local baseline can go stale with concurrent editors — Phase 8 guard).
- AI commit-message generation treated as optional (legacy had it).
