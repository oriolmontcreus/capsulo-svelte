# Capsulo Svelte

## Starting development (Astro + auth middleware)

To run **both** the Astro dev server and the Cloudflare Pages middleware locally—so routes such as `/admin` respect Supabase auth on the edge—use the **VS Code tasks** defined in [`.vscode/tasks.json`](.vscode/tasks.json):

1. Open the Command Palette and choose **Tasks: Run Task**.
2. Select **`run dev`**.

That starts two terminals in parallel:

- **Dev** — Astro with HMR on `127.0.0.1:4322` (upstream behind the proxy).
- **Auth middleware** — `wrangler pages dev` on **`127.0.0.1:4321`**, proxying to Astro.

Open the app at **`http://127.0.0.1:4321`** (not `:4322`). Magic Link redirects should use the same origin (add `http://127.0.0.1:4321/login` to Supabase redirect URLs).

Ensure **`pnpm build`** has been run at least once so `dist/` exists before Wrangler starts. Astro-only development without the middleware remains **`pnpm dev`** (`localhost` default port); it does **not** execute Pages middleware.
