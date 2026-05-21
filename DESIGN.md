# Design System

Living spec for the visual and interaction language of this project. Source of truth for tokens, components, and patterns. Tokens are defined in [src/styles/global.css](src/styles/global.css) — this document explains the *why* behind them and how to apply them.

---

## 1. Brand & Principles

A modern, minimalist, high-contrast interface inspired by the Svelte aesthetic. The login screen ([src/pages/login.astro](src/pages/login.astro)) is the canonical reference.

- **Minimal first.** Whitespace, type, and one decisive accent. Decoration only where it earns its place (e.g. the GlitterCloth orange panel).
- **High-contrast text.** Foreground is near-pure on background; muted variants exist for hierarchy, never for legibility.
- **One accent, used sparingly.** Svelte orange `#FF6900` carries identity and CTAs. It does not decorate; it directs.
- **Mixed radius language.** Inputs and small chips are nearly square (radius-xs/sm). Surfaces (cards, sheets, modals) lean into more generous `rounded-xl` / `rounded-2xl`. This contrast — sharp controls inside soft containers — is intentional.
- **Calm motion.** Transitions are short (≤200ms), easing is natural, no bounces on UI chrome.

---

## 2. Color System

All colors live in OKLCH for predictable perceptual scaling across light and dark. Defined in [src/styles/global.css](src/styles/global.css:9-60).

### 2.1 Brand accent — Svelte Orange

| Token | Value | Hex equivalent | Use |
|---|---|---|---|
| `--accent` | `oklch(0.6996 0.201959 44.4414)` | `#FF6900` | Primary CTAs, focus highlights, brand surfaces |
| `--accent-secondary` | `oklch(0.5096 0.151959 44.4414)` | deeper burnt orange | Hover/pressed states, gradients, secondary accent surfaces |

In dark mode the same hue is held but chroma drops slightly to avoid glare:
- `--accent` → `oklch(0.6996 0.181959 44.4414)`
- `--accent-secondary` → `oklch(0.5096 0.131959 44.4414)`

**Rule:** never colorize body text with `--accent`. It is reserved for action affordances and brand surfaces (e.g. the cloth panel on `/login`).

### 2.2 Neutrals

Neutrals share a single `--base-hue: 265` (cool blue-violet) so light and dark themes stay perceptually coherent.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.2574 0.0056 265)` | App surface |
| `--background-inset` | `oklch(0.9764 …)` | `oklch(0.2099 …)` | Recessed surfaces (page behind cards) |
| `--background-muted` | `oklch(0.956 …)` | `oklch(0.283 …)` | Subtle filled chips, hovered rows |
| `--foreground` | `oklch(0.1881 …)` | `oklch(0.9674 …)` | Body & headings |
| `--foreground-muted` | `oklch(0.5493 …)` | `oklch(0.669 …)` | Captions, descriptions, placeholder |
| `--border` | `oklch(0.4224 … / 0.1)` | `oklch(0.999 … / 0.05)` | Hairlines on inputs, cards |
| `--fixed-light` / `--fixed-dark` | constants | constants | Colors that must not flip with theme (e.g. text over the orange panel always stays light) |

### 2.3 Semantic shadcn tokens

The shadcn layer ([src/styles/global.css](src/styles/global.css:95-162)) defines `--primary`, `--secondary`, `--muted`, `--destructive`, etc. These map to component variants in [src/lib/components/ui/button/button.svelte](src/lib/components/ui/button/button.svelte:7-32). Treat them as **role tokens**, not colors — change the variant to change meaning.

### 2.4 Contrast targets

- Body text on background: ≥ 7:1 (AAA)
- Muted text on background: ≥ 4.5:1 (AA)
- Text on `--accent`: use `--fixed-light` (white). Verify ≥ 4.5:1.

---

## 3. Typography

Single typeface: **Inter Variable**, loaded via `@fontsource-variable/inter` in [src/styles/global.css](src/styles/global.css:4). Mapped to `--font-sans` and applied to `<html>` via the base layer.

### 3.1 Scale (Tailwind utilities)

| Role | Class | Weight | Tracking |
|---|---|---|---|
| Display / page title | `text-3xl` / `text-4xl` | `font-normal` | `tracking-tight` |
| Card / section title | `text-2xl` | `font-normal` | normal |
| Body | `text-base` | `font-normal` | normal |
| Label | `text-sm` | `font-medium` | normal |
| Caption / helper | `text-sm` | `font-normal`, `text-foreground-muted` | normal |
| UI / buttons | `text-sm` | `font-medium` | normal |

### 3.2 Weight philosophy

**Default to `font-normal` (400) everywhere.** Including titles. Hierarchy comes from *size and color*, not weight. See the login: `<Card.Title class="text-2xl">Sign in</Card.Title>` ([LoginMagicLink.svelte:60](src/lib/LoginMagicLink.svelte#L60)) — large, but regular weight.

`font-semibold` (600) is reserved for **emphasis on specific words or values inside otherwise-normal text** — a name in a notification, the total in a summary, the matched term in a search result. It is a spotlight, not a default. If most of a heading is semibold, you've lost the spotlight.

`font-medium` (500) is allowed for **small UI text** (`text-sm` and below: labels, buttons, badges) where the small size makes pure regular feel thin. Anything `text-base` or larger should be `font-normal` unless it's an emphasized fragment.

**Never use `font-bold` (700+)** in product UI. If something feels like it needs bold, it probably needs to be *larger* instead.

### 3.3 Vertical rhythm between texts

Titles and their subtitles must feel like one unit, not two stacked elements. Pair them with a tight, consistent gap:

| Pairing | Gap |
|---|---|
| Page title + lead paragraph | `gap-2` (8px) |
| Card title + card description | `gap-1.5` (6px) — shadcn `CardHeader` default |
| Section title + section body | `gap-2` (8px) |
| Label + input | `gap-2` (8px) — handled by `Field` |
| Label + helper / error below input | `gap-1.5` (6px) — handled by `FieldContent` |

Rules:
- **Always use `gap-*` on a flex/grid parent**, never `mb-*` / `mt-*` on the title or subtitle. Margins on text drift across contexts; gap stays consistent.
- **Subtitles take `text-foreground-muted`.** Color carries the hierarchy alongside the small gap — the closer two pieces of text sit, the more they need the color contrast to read as separate.
- **Between *unrelated* text blocks**, jump to `gap-6` or `gap-8`. Don't let a 12px gap try to mean both "related" and "separate" — pick one.
- **Line-height matters in the gap.** Tailwind's default `leading-*` already adds vertical space; do not compensate with extra margin.

### 3.4 Line length & balance

Use `text-balance` on descriptions and headings of constrained widths. Body copy should sit at 50–75ch. Constrain forms to `max-w-sm` (320–384px).

---

## 4. Radius — the mixed system

Radii are powers of `--radius-base: 0.275rem` (≈4.4px). See [src/styles/global.css](src/styles/global.css:74-82).

| Token | Computed | Where to use |
|---|---|---|
| `rounded-none` | 0 | Brand surfaces, decorative panels (e.g. login cloth), full-bleed sections |
| `rounded-xs` | ~4px | Tags, badges |
| `rounded-sm` | ~9px | **Inputs, small buttons, chips** — default for interactive controls |
| `rounded-md` | ~13px | Buttons (shadcn default) |
| `rounded-lg` | ~18px | Cards on mobile |
| `rounded-xl` | ~26px | **Cards, sheets, modals** — preferred container radius |
| `rounded-2xl` | ~35px | Top of pull-up sheets (see `rounded-t-2xl` on mobile login sheet) |
| `rounded-full` | pill | Avatars, toggles, dot indicators |

### Mental model

- **Small things are crisp.** Inputs and buttons sit on `sm`–`md`. They feel precise.
- **Big things are soft.** Cards, modals, and sheets sit on `xl`–`2xl`. They feel friendly.
- **Brand canvases are flat.** Decorative panels are `none`. They feel architectural.

This intentional contrast is the personality of the system. Resist the urge to "harmonize" radius across scales.

---

## 5. Spacing

Tailwind default 4px scale. Practical defaults:

| Context | Spacing |
|---|---|
| Inside inputs | `px-3 py-2` |
| Inside buttons (default) | `h-9 px-2.5` |
| Card padding | `p-6` |
| Form field gap (`FieldGroup`) | `gap-4` |
| Section gap | `gap-8` / `gap-12` |
| Page gutter (mobile) | `px-4` |
| Page gutter (desktop) | `px-6` / `px-8` |

Vertical rhythm: prefer `gap-*` on flex/grid parents over `mt-*` on children. Margins are a last resort.

---

## 6. Elevation

Stacked, low-opacity shadows ([src/styles/global.css](src/styles/global.css:25-48)). They are **always black at 6% opacity** and stacked for depth — never tinted, never heavy.

| Token | Use |
|---|---|
| `shadow-xs` | Resting buttons, inputs |
| `shadow-sm` | Cards on light backgrounds |
| `shadow-md` | Dropdowns, tooltips |
| `shadow-lg` | Popovers |
| `shadow-xl` / `shadow-2xl` | Modals, dialogs |

In dark mode, shadows are visually weaker — combine with `--border` for separation.

---

## 7. Components

Built on **shadcn-svelte** ([components.json](components.json)). Variants are the contract; do not restyle by adding classes on the consuming side unless extending — extend via `class` prop merged through `cn()`.

### 7.1 Buttons

Defined in [src/lib/components/ui/button/button.svelte](src/lib/components/ui/button/button.svelte:7-32). Use semantic variants:

- `default` — primary CTA (filled, high-contrast). One per view.
- `secondary` — quiet action, often paired with a default. See "Continue as …" on `/login`.
- `outline` — neutral action with visible border, good for toolbars.
- `ghost` — tertiary, only-on-hover background.
- `destructive` — irreversible actions only.
- `link` — inline text actions.

Sizes: `xs | sm | default | lg | icon | icon-xs | icon-sm | icon-lg`. Icon buttons are square; align icons with `data-icon="inline-start"` / `inline-end` to get correct padding.

### 7.2 Inputs & Fields

Compose with the `Field` family ([src/lib/components/ui/field](src/lib/components/ui/field)):

```svelte
<FieldGroup>
  <Field>
    <FieldLabel for={id}>Email</FieldLabel>
    <FieldContent>
      <Input id={id} ... aria-invalid={hasError} />
      {#if hasError}<FieldError>{msg}</FieldError>{/if}
    </FieldContent>
  </Field>
</FieldGroup>
```

Always pair `<FieldLabel for>` with `<Input id>`. Errors go through `<FieldError>`, help text through `<FieldDescription>`. Do not invent ad-hoc error styling.

### 7.3 Cards

Standard structure: `Card.Root > Card.Header (Title + Description) > Card.Content > Card.Footer`. Use cards as the default container for form units, summary blocks, and self-contained widgets.

### 7.4 Other primitives available

`badge`, `dropdown-menu`, `select`, `separator`, `tabs`, `tooltip` — see [src/lib/components/ui/](src/lib/components/ui/). Prefer these over hand-rolled equivalents.

---

## 8. Layout patterns

### 8.1 Split-screen auth (canonical)

See [src/pages/login.astro](src/pages/login.astro):
- Desktop: 30% decorative orange panel (left) + neutral form column (right). Form is centered, max-width `320px`.
- Mobile: full-screen decorative background, content rises as a `rounded-t-2xl` sheet from the bottom. The hard break between square decoration and rounded sheet is part of the design language.

### 8.2 Form pages

- Max width `max-w-sm` (form) or `max-w-md` (card with header + form).
- Centered vertically when content < viewport; top-aligned with `pt-12` when content scrolls.
- One primary action per form, always full-width on mobile.

### 8.3 Theme toggle placement

Always top-right, fixed within the layout, above decorative backgrounds (`z-20`). See [LightSwitch.svelte](src/lib/components/LightSwitch.svelte) usage in the login.

---

## 9. Motion

- **Transitions:** Tailwind's `transition-all` with default duration (150ms). Reserve longer durations (300ms+) for modal/sheet enter/exit.
- **Active feedback:** subtle 1px translate on press, already baked into `buttonVariants` base (`active:not-aria-[haspopup]:translate-y-px`). Don't re-implement.
- **Decorative motion:** the `GlitterCloth` panel on `/login` is the only ambient motion; it stays off the critical path and respects `prefers-reduced-motion` upstream.
- **Reduced motion:** never make information depend on motion. Animations are reinforcement, not communication.

---

## 10. Iconography

[`@lucide/svelte`](https://lucide.dev) is the icon set. Stroke-based, 1.5px, geometric — matches the rest of the system. Default size `size-4` inside buttons (handled by the variant base class). Icons used purely decoratively get `aria-hidden`; icons that carry meaning get an adjacent visually-hidden label or a `title`.

---

## 11. Dark mode

Triggered by the `.dark` class on a root ancestor (see `@variant dark` in [global.css:7](src/styles/global.css#L7)). Every component supports both modes via tokens — do not write `dark:` overrides unless adjusting **structure**, not color.

**Rule:** if you need a `dark:bg-...`, the token is wrong. Fix the token, not the consumer.

---

## 12. Accessibility checklist

- All interactive elements have a visible `:focus-visible` ring (built into shadcn variants).
- All inputs have explicit `<FieldLabel for>` (or `aria-label` when no visual label exists).
- Color is never the only signal — pair with text, icon, or border.
- Minimum hit target 36×36px (matches `size-9` default).
- Honor `prefers-reduced-motion` for any animation > 200ms.

---

## 13. When in doubt

1. Open [/login](src/pages/login.astro) and ask: *would this fit here?*
2. Check if a shadcn primitive in [src/lib/components/ui/](src/lib/components/ui/) already solves it.
3. Re-read sections 1 (Principles) and 4 (Radius).
4. If you're still unsure, prefer **less**: less color, less weight, less radius variation, less motion.
