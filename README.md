# Capsulo Svelte

A static-first site + CMS that runs on **one free Cloudflare account** (no credit card):

- **Public pages** are prerendered by Astro and served as static assets, which are free and unlimited on Workers.
- **The CMS** (`/admin`) talks to a small API on the same Worker (`src/pages/api/capsulo`):
  - **D1** stores pages, history, globals, users and sessions.
  - **Workers KV** stores uploaded files.
- **Publishing:** a CMS commit fires a Workers Builds Deploy Hook. The build pulls the published content and uploads, and bakes them into the static site.

## Start a new project

```sh
npm create capsulo@latest my-client-site   # or: pnpm create capsulo my-client-site
cd my-client-site
pnpm dev                                    # site: http://localhost:4321, CMS: http://localhost:4321/admin
```

No accounts or `.env` are needed to develop. `pnpm dev` applies the D1 migrations to a local database, and `/admin` signs you in automatically as a local "Developer" user. To test the real login flow, put `DEV_AUTO_LOGIN=false` in `.dev.vars`.

## Deploy

```sh
npx capsulo deploy
```

The first run takes a few minutes:

1. Logs in to Cloudflare (`wrangler login`).
2. Creates the D1 database and the KV namespace, and writes their ids into `wrangler.jsonc`. It suggests `<project>-db` / `<project>-uploads`; answer "No" to pick your own names, or pass `--db-name` / `--kv-name`. An existing database or namespace with that name is reused.
3. Applies the migrations, builds and deploys to `https://<name>.<account>.workers.dev`.
4. Creates the first CMS user (your client) and prints their password once.
5. Offers to create a private GitHub repo (`gh`) and commit the deploy settings.
6. Walks you through **auto-publishing**. The repo connection and the Deploy Hook have to be created in the Cloudflare dashboard (there's no API for them yet); paste the hook URL and the CLI stores it as the `DEPLOY_HOOK_URL` secret.

Later runs are safe: they skip what already exists, then pull, build and deploy.

Output stays short: each step prints one line, and a failing step prints the end of its log. Other flags: `--verbose` shows the full wrangler/astro output, `-y` / `--yes` accepts the recommended names and defaults, and `--skip-build` deploys the existing `dist/`.

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

Passwords fit the free plan's 10 ms CPU limit. The browser stretches them with PBKDF2-SHA256 (600k rounds) and the Worker only compares one SHA-256 of the result, so a leaked database still costs an attacker the full PBKDF2 work per guess. See `packages/cli/src/password.js`.

## How content reaches the public site

- `pnpm build` runs `capsulo pull && astro build`.
- `capsulo pull` fetches `<siteUrl>/api/capsulo/export` (the site URL is in `.capsulo/project.json`). It writes `.capsulo/published/content.json` and copies uploads into `public/uploads/`.
- `src/middleware.ts` loads each page's published values before it prerenders, so capsules render the real content through `getCmsData()`. In `astro dev` the values come straight from the local D1.
- In the editor preview, drafts still flow in over `postMessage` (see [`docs/cms/live-preview.md`](docs/cms/live-preview.md)).

`capsulo pull --local` snapshots your local database instead, which is handy for checking a production build locally.

## Free plan limits

These are per Cloudflare account and shared by every project in it:

| Resource | Free limit | Notes |
|---|---|---|
| Worker requests | 100k / day | Only the CMS API and builds use them; public pages are static |
| D1 databases | 10 | One per project, so about 10 client projects per account |
| KV storage | 1 GB, 1k writes / day | For uploads; compress images before uploading |
| Workers Builds | 3,000 min / month | Deploy Hooks dedupe bursts of commits |

## Repository layout

- `src/`: the Astro site, CMS admin and API (`src/pages/api/capsulo`, `src/lib/server`).
- `migrations/`: D1 schema.
- `packages/cli`: the `capsulo` CLI (`deploy`, `users`, `pull`).
- `packages/create-capsulo`: `npm create capsulo`. To test it against this checkout, run `node packages/create-capsulo/bin/create-capsulo.js ../test-site --template .`
