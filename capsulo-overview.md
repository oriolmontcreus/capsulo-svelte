# Capsulo - Overview

## What is Capsulo?

Capsulo is a **CMS Framework** (also known as a CMF — Content Management Framework) that lets developers define content structures as code and manage them through a beautiful interface. It is built for developers who want full control without sacrificing ease of use.

Unlike traditional CMS platforms that force you into their way of doing things, Capsulo takes a **schema-first approach**: you define your content structures using familiar React/TSX components with a Fluent API, and Capsulo automatically generates the CMS admin interface, TypeScript types, and form fields for you.

Capsulo is **100% open source** and **100% static by default**, meaning it can be hosted for free on platforms like Cloudflare Pages, Vercel, Netlify, or GitHub Pages.

---

## The Story Behind Capsulo

Capsulo was created by **Oriol M** out of frustration with existing solutions:

- **Reinventing the wheel**: Every time a content-driven website needed to be built, the same problems had to be solved from scratch — content management, translations, deployment, and more.
- **Deployment hassle**: Getting a project from development to production was always painful.
- **Vendor lock-in**: Platforms that force you into their way of doing things, with little flexibility, or that charge a fortune for basic features.

Capsulo aims to solve these problems by providing a flexible, type-safe, and repository-native CMS framework that handles the common tasks automatically. As the creator puts it:

> "Never build a translations system again, don't worry about databases or 'where I will host this'. Don't worry about performance. **Just focus on building your website.**"

---

## Philosophy

Capsulo is built on three core principles that guide every design decision:

### 1. Simplicity

Building content-driven websites shouldn't require complex configuration or learning curves. Capsulo embraces simplicity through:

- **Schema-as-Code**: Write your content schemas using familiar React/TSX components with a Fluent API. No visual builder, no drag-and-drop — just code.
- **GitHub-Native**: Your content lives in your repository, versioned and backed up automatically with Git. No databases, no servers, no content versioning headaches.
- **Zero Infrastructure**: Deploy to any static host for free. No servers to maintain, no databases to manage. By default, Capsulo is 100% static, which is why it can be hosted anywhere — even at zero cost.
- **100% Open Source**: Anyone can fork it and use it as a template to build a custom CMS that perfectly fits their specific requirements.

### 2. Control

You own your content and control every aspect of how it works:

- **Full Customization**: Write schemas as code, not through restrictive UIs. You decide the exact shape of your data and how it integrates with your components.
- **Type Safety**: Built with TypeScript and Zod for automatic type inference and runtime validation. If you define an Input type as "email", Capsulo won't let you save anything other than a valid email.
- **No Lock-in**: Your content is stored in your repository as markdown and JSON. Switch frameworks or platforms anytime without losing your work.

> **Note on image storage**: You need somewhere to host your images. Capsulo is powered by Cloudflare R2 by default but can be switched to any other storage provider.

### 3. Performance

Speed matters for both developers and end users:

- **Static-First Architecture**: Unlike traditional server-dependent CMS platforms, Capsulo uses a static-first approach powered by Astro. This also translates into better SEO.
- **Flexibility**: While it's 100% static by default, you aren't locked in. You can opt out of a full static setup and connect your own backend, APIs, or other services if your project grows beyond static needs.
- **Build-Time Optimization**: Your data gets injected directly into your pages, so at the end you just have static HTML and CSS. By default, Capsulo doesn't ship any JS to the client unless you explicitly want to (Astro's "Zero JS by default" feature).
- **Blazing Fast**: No database queries, no server processing. Capsulo handles image optimization, caching, and CDN distribution automatically.

---

## Key Features

### Schema-Based Architecture
Define content structures as code using React/TSX components with a Fluent API. Automatic discovery — no registration needed.

```typescript
export const HeroSchema = createSchema("Hero", [
  Input("title").label("Hero Title").required().defaultValue("Welcome"),
  Grid({ base: 1, md: 2 }).contains([
    Input("ctaButton").label("CTA Button"),
    Input("ctaLink").label("CTA Link"),
  ]),
], "Hero section with title and CTA", "hero");
```

### 100% Static & Free to Host
By default, Capsulo is 100% static. Deploy to Cloudflare Pages, Vercel, Netlify, GitHub Pages, or any host — for free.

### 100% Open Source
Love the recipe but hate the seasoning? Fork it to make it yours, or submit a PR. The kitchen is yours.

Repository: [github.com/oriolmontcreus/capsulo](https://github.com/oriolmontcreus/capsulo)

### GitHub-Native Storage
Dual storage: local files for development and GitHub API for production, with user-specific draft branches and GitHub Actions integration.

### Built-in Translations
Translations supported out of the box for multi-language content management. Mark any text field as `.translatable()` and a translation sidebar automatically appears in the CMS.

### Global Variables
Define and use global variables — modify them once and they change everywhere. Perfect for site-wide settings like site name, contact info, and social media links.

### Auto Discovery
When you import a Capsule component into your pages, Capsulo detects it automatically and surfaces the right CMS fields for that page. No registration, no configuration.

### Type Safety
Automatic TypeScript type generation from your schemas. Your schema IS your type definition. Add a toggle field and Capsulo knows it's a `boolean`. A required input becomes a `string`. An optional one becomes `string | undefined`.

### Runtime Validation
Built with Zod for runtime validation. Your content is guaranteed to adhere to the defined schemas.

### Beautiful Admin Interface
Content creators get a beautiful, auto-generated CMS interface at `/admin` using shadcn/ui components. No code required — just fill out forms.

### AI-Powered Features
Capsulo includes an AI chat interface in the admin panel that can assist with content editing and management tasks.

---

## Perfect For

| Use Case | Description |
|---|---|
| **Landing Pages** | Fast, conversion-focused pages with editable content |
| **Blogs** | Personal or company blogs with easy content management |
| **Portfolios** | Showcase your work with a beautiful, manageable interface |
| **Marketing Websites** | Multi-page sites with frequently updated content |
| **Product Pages** | SaaS product sites with dynamic content sections |
| **Agency Websites** | Client projects requiring non-technical content updates |
| **Component Libraries** | Showcase your React, Vue, or web components with live demos |
| **Open Source Showcases** | Create beautiful project pages with instant and free hosting |

---

## How Capsulo Compares

| Aspect | Capsulo | Traditional CMS (WordPress, etc.) | Headless CMS (Strapi, Contentful, etc.) |
|---|---|---|---|
| **Content definition** | Code-first (TypeScript) | Database/UI-first | Database/UI-first |
| **Type safety** | Full (TypeScript + Zod) | None | Partial (generated types) |
| **Hosting** | Static, free anywhere | Requires server | Requires server or paid plan |
| **Content storage** | Git repository (your repo) | Database | Database / cloud |
| **Vendor lock-in** | None (your code, your repo) | High (plugins, themes) | Medium (API dependency) |
| **Developer experience** | Code-first, type-safe | PHP, plugins | API-first, GUI config |
| **Content editing** | Beautiful admin UI | Classic dashboard | Headless dashboard |
| **Cost** | Free (open source + free hosting) | Varies (hosting + plugins) | Varies (often paid plans) |
| **Performance** | Static HTML, zero JS by default | Server-rendered | API-dependent |
| **Multi-framework** | Astro (React, Vue, Svelte, etc.) | PHP only | Any (via API) |

---

## Quick Start Example

### 1. Define your schema

```typescript
// src/capsules/hero/hero.schema.tsx
import { createSchema } from "@/lib/form-builder/builders/SchemaBuilder";
import { Input, Textarea } from "@/lib/form-builder/fields";

export const HeroSchema = createSchema("Hero", [
  Input("title").label("Hero Title").required().translatable().defaultValue("Welcome"),
  Textarea("subtitle").label("Subtitle").rows(3).translatable().defaultValue("A CMS for developers"),
], "Hero section with title and CTA", "hero");
```

### 2. Build your component

```astro
---
// src/capsules/hero/Hero.astro
import type { SchemaProps } from '@/lib/schema-props';
import { HeroSchema } from './hero.schema';

export type Props = SchemaProps<typeof HeroSchema>;
const { title, subtitle } = Astro.props;
---

<section>
  <h1>{title}</h1>
  <p>{subtitle}</p>
</section>
```

### 3. Get types automatically

```typescript
// hero.types.ts — auto-generated, do not edit
export interface HeroTypes {
  title: string;        // required Input -> string
  subtitle?: string;    // optional Textarea -> string | undefined
}
```

### 4. Edit in the CMS

Content creators can now edit the Hero component directly at `/admin` with a beautiful, auto-generated form. No code required!

---

## Technology Stack

| Component | Technology |
|---|---|
| **Framework** | Astro |
| **CMS Admin UI** | React + shadcn/ui |
| **Type System** | TypeScript |
| **Validation** | Zod |
| **Storage (Dev)** | Local filesystem |
| **Storage (Prod)** | GitHub API |
| **Image Storage** | Cloudflare R2 (default, swappable) |
| **Authentication** | GitHub OAuth via Cloudflare Worker |
| **Deployment** | Any static host (Vercel, Cloudflare Pages, Netlify, GitHub Pages) |
| **Schema Definition** | React/TSX with Fluent API |

---

## Current Status

Capsulo is currently in **active development**. Some features may change before the stable release. The project is open source and welcoming contributions.

- **Main Repository**: https://github.com/oriolmontcreus/capsulo
- **Documentation Repository**: https://github.com/oriolmontcreus/capsulo-docs
