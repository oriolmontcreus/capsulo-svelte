# Capsulo Svelte

A static-first site + CMS that runs on **one free Cloudflare account** (no credit card):

- **Public pages** are prerendered by Astro and served as static assets, which are free and unlimited on Workers.
- **The CMS** (`/admin`) talks to a small API on the same Worker (`/api/capsulo/*`):
  - **D1** stores pages, history, globals, users and sessions.
  - **Workers KV** stores uploaded files by default (up to 25 MB each). A project can use **R2** instead for bigger files; see [File storage](#file-storage).
- **Publishing:** a CMS commit fires a Workers Builds Deploy Hook. The build pulls the published content and uploads, and bakes them into the static site.

## Start a new project

```sh
npm create capsulo@latest my-client-site   # or: pnpm create capsulo my-client-site
cd my-client-site
pnpm dev                                    # site: http://localhost:4321, CMS: http://localhost:4321/admin
```

The new project contains only your site: pages, layouts, styles, `capsulo.config.ts` and your capsules (`src/components/capsules`). The admin, the CMS API and the build plumbing come from the `capsulo` package as an Astro integration:

```js
// astro.config.mjs
import capsulo, { capsuloAdapter } from "capsulo/astro";
import capsuloConfig from "./capsulo.config.ts";

export default defineConfig({
	adapter: capsuloAdapter(),
	integrations: [capsulo(capsuloConfig)],
});
```

Capsules and schemas import what they need from the package: `capsulo/schema` (`defineCapsule`, `createSchema`, the field builders), `capsulo/runtime` (`getCmsData`, `cmsStore`, `mediaUrl`) and `capsulo/components/CapsuloScripts.astro` (put once in your layout).

No accounts or `.env` are needed to develop. `pnpm dev` applies the D1 migrations to a local database, and `/admin` signs you in automatically as a local "Developer" user. To test the real login flow, put `DEV_AUTO_LOGIN=false` in `.dev.vars`.

## Updating Capsulo

The admin and the CMS live in `node_modules`, so a project gets new Capsulo versions with one command:

```sh
pnpm update capsulo   # then deploy (or push, with auto-publishing)
```

Database changes ship with the package: `wrangler.jsonc` points `migrations_dir` at `node_modules/capsulo/src/migrations`, so `pnpm dev` and `capsulo deploy` apply new migrations on their own.

## Ejecting

If a project needs changes to the admin itself, eject it:

```sh
npx capsulo eject
```

After a confirmation, it copies Capsulo's source (admin, API routes, integration, migrations) into `src/capsulo/`, points `astro.config.mjs`, `capsulo.config.ts` and your `capsulo/*` imports at that copy, moves `migrations_dir` to `src/capsulo/migrations`, adds the admin's dependencies to `package.json` and records the ejected version in `.capsulo/project.json`. The copy is byte for byte the installed version, so diffing it against a newer release shows exactly what changed.

**This is one way:** after ejecting, `pnpm update capsulo` no longer updates the admin, and new Capsulo versions have to be merged into `src/capsulo/` by hand. The `capsulo` CLI stays installed (pinned to the ejected version, since its SQL matches that schema). `npm create capsulo` can also eject from the start (`--eject`).

## Deploy

```sh
npx capsulo deploy
```

The first run takes a few minutes:

1. Logs in to Cloudflare (`wrangler login`).
2. Creates the D1 database and the upload storage (a KV namespace, or an R2 bucket for R2 projects), and writes their ids into `wrangler.jsonc`. It suggests `<project>-db` / `<project>-uploads`; answer "No" to pick your own names, or pass `--db-name` / `--kv-name`. An existing database or namespace with that name is reused.
3. Applies the migrations, builds and deploys to `https://<name>.<account>.workers.dev`.
4. Creates the first CMS user (your client) and prints their password once.
5. Offers to create a private GitHub repo (`gh`) and commit the deploy settings.
6. Walks you through **auto-publishing**. The repo connection and the Deploy Hook have to be created in the Cloudflare dashboard (there's no API for them yet); paste the hook URL and the CLI stores it as the `DEPLOY_HOOK_URL` secret.

Later runs are safe: they skip what already exists, then pull, build and deploy.

Output stays short: each step prints one line, and a failing step prints the end of its log. Other flags: `--verbose` shows the full wrangler/astro output, `-y` / `--yes` accepts the recommended names and defaults, and `--skip-build` deploys the existing `dist/`.

## File storage

Files uploaded in the CMS go to one of two places. `npm create capsulo` asks which (or pass `--storage kv|r2`):

| | Workers KV (default) | R2 |
|---|---|---|
| Max file size | 25 MB | 100 MB (the Worker request limit) |
| Free storage | 1 GB | 10 GB |
| Setup | Nothing extra | Cloudflare asks for a payment method once to enable R2, even for the free tier |

Either way, the public site serves copies baked into the static build, so visitor traffic never reads from KV or R2.

To move an existing project from KV to R2 (for example to upload videos):

```sh
npx capsulo storage       # shows where uploads are stored
npx capsulo storage r2    # moves them to R2
```

`capsulo storage r2` guides you through enabling R2 (adding the payment method is the one manual step), creates the bucket, adds it to `wrangler.jsonc`, deploys so new uploads go to R2, then copies every existing file. The KV namespace stays bound as a read-only fallback, so no file breaks while they are copied; the command explains how to remove it afterwards. It is safe to re-run. Before the project is deployed, or with `--local`, it only moves the files of your local dev storage.

## CMS users

Editors sign in with an email or a username plus a password. Nobody signs up and no emails are sent; you manage access with the CLI:

```sh
npx capsulo users add client@acme.com --name "Jane (Acme)"   # prints a generated password once
npx capsulo users add editor2 --ask-password                  # a username works too
npx capsulo users list
npx capsulo users update client@acme.com --reset-password    # also signs them out
npx capsulo users update client@acme.com --disable
npx capsulo users remove editor2
```

Commands target the deployed database once the project is deployed, and the local one before that. Force either with `--remote` or `--local`.

Passwords fit the free plan's 10 ms CPU limit. The browser stretches them with PBKDF2-SHA256 (600k rounds) and the Worker only compares one SHA-256 of the result, so a leaked database still costs an attacker the full PBKDF2 work per guess. See `packages/capsulo/src/password.js`.

## How content reaches the public site

- `pnpm build` runs `capsulo pull && astro build`.
- `capsulo pull` fetches `<siteUrl>/api/capsulo/export` (the site URL is in `.capsulo/project.json`). It writes `.capsulo/published/content.json` and copies uploads into `public/uploads/`.
- Capsulo's middleware loads each page's published values before it prerenders, so capsules render the real content through `getCmsData()`. In `astro dev` the values come straight from the local D1.
- In the editor preview, drafts still flow in over `postMessage` (see [`docs/cms/live-preview.md`](docs/cms/live-preview.md)).

`capsulo pull --local` snapshots your local database instead, which is handy for checking a production build locally.

## Admin language

The CMS speaks English, Spanish and French. Each editor picks their language from the language button in the admin nav (it's saved on their account); editors who haven't picked one get `admin.locale` from `capsulo.config.ts`, else their browser's language, else English. It's independent of the site's content languages (`i18n`):

```ts
export default defineCapsuloConfig({
	i18n: { /* ... */ },
	admin: { locale: "es" }, // "en" | "es" | "fr"
});
```

Messages live in `packages/capsulo/src/lib/admin-i18n/messages` (`en.ts` is the source of truth). Labels and descriptions in your schemas aren't translated: write them in your editors' language.

## AI agent

The sparkles button in the admin nav (or `⌘.` / `Ctrl+.`) opens an AI agent that reads your pages and global variables, answers questions about them and edits them on request. Its edits land in the draft, like manual ones: each shows up in the chat with Review and Undo, pages go live from Changes, and global variables with Save. Chats stay in the browser.

It runs on [Workers AI](https://developers.cloudflare.com/workers-ai/) through the `AI` binding in `wrangler.jsonc`: no API key and nothing to create. The free plan includes 10,000 Neurons a day, about 30 messages with the default model (`@cf/google/gemma-4-26b-a4b-it`); past that the agent stops until 00:00 UTC and nothing is billed. Pick another model with function calling, or turn the agent off, in `capsulo.config.ts`:

```ts
export default defineCapsuloConfig({
	i18n: { /* ... */ },
	ai: { model: "@cf/openai/gpt-oss-120b" }, // or { enabled: false }
});
```

Workers AI has no local simulator, so in `pnpm dev` the agent needs your Cloudflare login once (`npx wrangler login`); it tells you when. Local use counts against the same daily allowance. Everything else in `pnpm dev` works without a login.

## Free plan limits

These are per Cloudflare account and shared by every project in it:

| Resource | Free limit | Notes |
|---|---|---|
| Worker requests | 100k / day | Only the CMS API and builds use them; public pages are static |
| D1 databases | 10 | One per project, so about 10 client projects per account |
| KV storage | 1 GB, 1k writes / day | Default upload storage; compress images before uploading |
| R2 storage | 10 GB, 1M writes / month | Optional upload storage; needs a payment method on file |
| Workers Builds | 3,000 min / month | Deploy Hooks dedupe bursts of commits |
| Workers AI | 10,000 Neurons / day | The AI agent; about 30 messages a day with the default model |

## Repository layout

- `packages/capsulo`: the `capsulo` package.
  - `src/`: everything a project gets as source (and exactly what `capsulo eject` copies). It holds the integration (`src/integration`), the admin and API routes (`src/routes`), the admin's code (`src/lib`), the D1 migrations (`src/migrations`) and the public entry points (`src/schema.ts`, `src/runtime.ts`, `src/config.js`, `src/components`).
  - `cli/` and `bin/`: the CLI (`deploy`, `users`, `pull`, `storage`, `eject`).
  - `pnpm --dir packages/capsulo build` bundles the integration to `dist/astro.js` (`capsulo/astro`). Astro loads `astro.config` with plain Node, which can't run TypeScript from `node_modules`; everything else ships as source.
- The repo root is the dev playground: a site with test capsules and pages that uses the package from the workspace. Its `astro.config.mjs` imports the integration from source, so changes apply without a build.
- `templates/starter`: what `npm create capsulo` copies into a new project.
- `packages/create-capsulo`: `npm create capsulo`. To test it against this checkout, run `pnpm --dir packages/capsulo build`, then `node packages/create-capsulo/bin/create-capsulo.js ../test-site --template .`
- `apps/docs`: the public docs site (see below).
- Manual tests: `npx tsx --import ./packages/capsulo/test/virtual-modules.mjs <file>.test-manual.ts` (the loader stands in for the integration's virtual modules).

## Docs site

`apps/docs` is the public documentation, an Astro site that looks like the old Fumadocs docs. Pages are MDX files in `apps/docs/src/content/docs`; each folder becomes a sidebar group, and an optional `meta.json` sets its title and order.

```sh
pnpm --filter capsulo-docs dev      # http://localhost:4322/docs/
pnpm --filter capsulo-docs check    # type check
pnpm --filter capsulo-docs deploy   # build and deploy to Cloudflare (static assets only)
```
