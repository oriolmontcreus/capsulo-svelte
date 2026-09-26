// Temporary brand exploration for /logo-proposals. Each mark is the inner markup of a
// 64×64 square SVG. Neutral shapes use `currentColor` so the same mark flips between
// light and dark backgrounds; the accent stays Svelte orange on both.

export const LOGO_VIEWBOX = "0 0 64 64";
export const LOGO_ACCENT = "#FF6900";
export const LOGO_INK_LIGHT = "#17171C";
export const LOGO_INK_DARK = "#F4F4F6";

export interface LogoProposal {
	id: string;
	name: string;
	concept: string;
	svg: string;
}

const A = LOGO_ACCENT;
const F = "currentColor";

export const logoProposals: LogoProposal[] = [
	{
		id: "split-pill",
		name: "Split Pill",
		concept:
			"The literal capsule: one pill on a diagonal, split into an orange half and a neutral half. The two halves read as content and code, sealed together in one unit.",
		svg: `<g transform="rotate(45 32 32)"><path fill="${A}" d="M21 30.5V17a11 11 0 0 1 22 0v13.5z"/><path fill="${F}" d="M21 33.5V47a11 11 0 0 0 22 0V33.5z"/></g>`,
	},
	{
		id: "stacked-blocks",
		name: "Stacked Blocks",
		concept:
			"Three pills of shrinking width, stacked like sections on a page. It shows how Capsulo builds a page out of capsules, and it looks a bit like a content outline.",
		svg: `<rect x="8" y="10" width="48" height="12" rx="6" fill="${F}"/><rect x="8" y="26" width="36" height="12" rx="6" fill="${A}"/><rect x="8" y="42" width="24" height="12" rx="6" fill="${F}"/>`,
	},
	{
		id: "braced-capsule",
		name: "Braced Capsule",
		concept:
			"An orange capsule held between curly braces. Schema-as-code in one glyph: you define the content in code, and Capsulo wraps it in an editor.",
		svg: `<g fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c-7 0-7 4-7 10v6c0 4-2 6-5 6 3 0 5 2 5 6v6c0 6 0 10 7 10"/><path d="M44 10c7 0 7 4 7 10v6c0 4 2 6 5 6-3 0-5 2-5 6v6c0 6 0 10-7 10"/></g><rect x="25" y="20" width="14" height="24" rx="7" fill="${A}"/>`,
	},
	{
		id: "nested-capsules",
		name: "Nested Capsules",
		concept:
			"A pill resting inside a soft square: a component inside a container. It echoes the design system's rule of sharp controls inside soft surfaces.",
		svg: `<rect x="6.5" y="6.5" width="51" height="51" rx="16" fill="none" stroke="${F}" stroke-width="5"/><rect x="18" y="24" width="28" height="16" rx="8" fill="${A}"/>`,
	},
	{
		id: "capsule-grid",
		name: "Capsule Grid",
		concept:
			"Four modules, one of them turned into a round orange capsule. The blocks are yours to arrange, and one piece is always the one being edited.",
		svg: `<rect x="6" y="6" width="24" height="24" rx="8" fill="${F}"/><rect x="34" y="6" width="24" height="24" rx="8" fill="${F}"/><rect x="6" y="34" width="24" height="24" rx="8" fill="${F}"/><circle cx="46" cy="46" r="12" fill="${A}"/>`,
	},
	{
		id: "orbit",
		name: "Orbit",
		concept:
			"A capsule travelling on a ring around a solid core. Your content circles one stable framework and goes from the editor to the live site and back.",
		svg: `<circle cx="32" cy="32" r="22" fill="none" stroke="${F}" stroke-width="5"/><circle cx="32" cy="32" r="8" fill="${F}"/><rect x="36.5" y="10.4" width="22" height="12" rx="6" fill="${A}" transform="rotate(45 47.56 16.44)"/>`,
	},
	{
		id: "pod-sprout",
		name: "Pod & Sprout",
		concept:
			"A seed pod with an orange sprout. Every project starts from one small template and grows into a full site, which suits a friendly open-source tool.",
		svg: `<path d="M32 20v10" stroke="${A}" stroke-width="4" stroke-linecap="round"/><path fill="${A}" d="M32 21c0-10 6-15 17-15 0 10-6 15-17 15zM32 23c0-7-5-10-14-10 0 7 5 10 14 10z"/><rect x="19" y="28" width="26" height="30" rx="13" fill="${F}"/>`,
	},
	{
		id: "time-capsule",
		name: "Time Capsule",
		concept:
			"An hourglass framed by two pill-shaped caps, with orange sand. Capsulo keeps every change in history, so content is preserved like a time capsule.",
		svg: `<rect x="12" y="6" width="40" height="8" rx="4" fill="${F}"/><rect x="12" y="50" width="40" height="8" rx="4" fill="${F}"/><path d="M18 14v4c0 8 10 11 10 14s-10 6-10 14v4M46 14v4c0 8-10 11-10 14s10 6 10 14v4" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round"/><path fill="${A}" d="M22 50c0-6 8-9 10-12 2 3 10 6 10 12zM25 19h14c-2 3-5 6-7 7-2-1-5-4-7-7z"/>`,
	},
	{
		id: "bolt-capsule",
		name: "Bolt Capsule",
		concept:
			"An orange capsule struck by a bolt. It stands for the static-first build: pages are prerendered, so they load instantly and cost nothing to serve.",
		svg: `<rect x="4" y="18" width="56" height="28" rx="14" fill="${A}"/><path fill="${F}" stroke="${F}" stroke-width="2" stroke-linejoin="round" d="M38 6 20 36h11l-5 22 18-31H33z"/>`,
	},
	{
		id: "globe-pill",
		name: "Globe Pill",
		concept:
			"A globe stretched into a capsule, with an orange meridian and equator. Translations are built in, so one capsule can speak every language.",
		svg: `<rect x="16.5" y="6.5" width="31" height="51" rx="15.5" fill="none" stroke="${F}" stroke-width="5"/><ellipse cx="32" cy="32" rx="6" ry="24" fill="none" stroke="${A}" stroke-width="4"/><path d="M19 32h26" stroke="${A}" stroke-width="4" stroke-linecap="round"/>`,
	},
	{
		id: "git-nodes",
		name: "Git Nodes",
		concept:
			"A branch graph whose tip is orange. It points to Capsulo's history, drafts and publishing flow: content is versioned like code.",
		svg: `<path d="M20 12v40M44 20c0 16-24 12-24 26" fill="none" stroke="${F}" stroke-width="5" stroke-linecap="round"/><circle cx="20" cy="12" r="7" fill="${F}"/><circle cx="20" cy="52" r="7" fill="${F}"/><circle cx="44" cy="18" r="8" fill="${A}"/>`,
	},
	{
		id: "iso-box",
		name: "Iso Box",
		concept:
			"An isometric box with an orange lid. It stands for the build output: one self-contained package you can host anywhere, for free.",
		svg: `<g stroke-linejoin="round" stroke-width="3"><path fill="${A}" stroke="${A}" d="M32 7.5 53 19.5 32 31.5 11 19.5z"/><path fill="${F}" stroke="${F}" d="M11 23v21.5L30 55.5V34z"/><path fill="${F}" stroke="${F}" opacity=".55" d="M53 23v21.5L34 55.5V34z"/></g>`,
	},
	{
		id: "angle-frame",
		name: "Angle Frame",
		concept:
			"Angle brackets around a slanted capsule, a tag where the slash is the product. Built for developers who want their CMS to feel like their codebase.",
		svg: `<path d="M18 18 6 32l12 14M46 18l12 14-12 14" fill="none" stroke="${F}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><rect x="26" y="12" width="12" height="40" rx="6" fill="${A}" transform="rotate(20 32 32)"/>`,
	},
	{
		id: "interlock",
		name: "Interlock",
		concept:
			"Two capsule outlines linked like a chain. The links can always come apart: open source, no vendor lock-in, and code and content working together.",
		svg: `<rect x="6" y="18" width="34" height="20" rx="10" fill="none" stroke="${F}" stroke-width="6"/><rect x="24" y="26" width="34" height="20" rx="10" fill="none" stroke="${A}" stroke-width="6"/><path d="M19 38h10" stroke="${F}" stroke-width="6"/>`,
	},
	{
		id: "app-tile",
		name: "App Tile",
		concept:
			"An orange tile with a white split capsule cut into it. As a solid app icon it looks the same on light and dark backgrounds, with no variant needed.",
		svg: `<rect x="4" y="4" width="56" height="56" rx="16" fill="${A}"/><g transform="rotate(45 32 32)"><rect x="23" y="12" width="18" height="40" rx="9" fill="#FFFFFF"/><path d="M23 32h18" stroke="${A}" stroke-width="3"/></g>`,
	},
	{
		id: "pixel-capsule",
		name: "Pixel Capsule",
		concept:
			"A capsule drawn on an 8×8 pixel grid. It stays sharp at favicon sizes and has a retro developer-tool feel.",
		svg: (() => {
			const rows = ["...AA...", "..AAAA..", "..AAAA..", "..AAAA..", "..FFFF..", "..FFFF..", "..FFFF..", "...FF..."];
			return rows
				.flatMap((row, y) =>
					[...row].map((cell, x) =>
						cell === "." ? "" : `<rect x="${x * 8 + 0.5}" y="${y * 8 + 0.5}" width="7" height="7" rx="1" fill="${cell === "A" ? A : F}"/>`,
					),
				)
				.join("");
		})(),
	},
	{
		id: "sheets",
		name: "Sheets",
		concept:
			"Stacked pages, with an orange block on the front one. It shows pages, drafts and history: the CMS side of Capsulo in one quiet shape.",
		svg: `<path d="M22 6h26a8 8 0 0 1 8 8v28" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round" opacity=".35"/><path d="M14 14h26a8 8 0 0 1 8 8v28" fill="none" stroke="${F}" stroke-width="4" stroke-linecap="round" opacity=".65"/><rect x="6" y="22" width="34" height="36" rx="8" fill="${F}"/><rect x="12" y="34" width="22" height="10" rx="5" fill="${A}"/>`,
	},
	{
		id: "keyhole",
		name: "Keyhole",
		concept:
			"A solid tile with an orange capsule keyhole. You own your content and your stack, and the client gets a safe, simple way in.",
		svg: `<rect x="6" y="6" width="52" height="52" rx="14" fill="${F}"/><circle cx="32" cy="26" r="9" fill="${A}"/><rect x="27" y="26" width="10" height="22" rx="5" fill="${A}"/>`,
	},
	{
		id: "crescent-c",
		name: "Crescent C",
		concept:
			"The split pill bent into a crescent: an orange half and a neutral half with rounded ends. It hints at an initial without being a letter.",
		svg: `<g fill="none" stroke-width="10"><path stroke="${A}" d="M44.86 16.68A20 20 0 0 0 12.05 30.6"/><path stroke="${F}" d="M12.05 33.4A20 20 0 0 0 44.86 47.32"/></g><circle cx="44.86" cy="16.68" r="5" fill="${A}"/><circle cx="44.86" cy="47.32" r="5" fill="${F}"/>`,
	},
	{
		id: "radial-spark",
		name: "Radial Spark",
		concept:
			"Eight capsules arranged in a burst, alternating neutral and orange. It reads as energy and launch, the \"just focus on building\" moment.",
		svg: (() => {
			const petal = (angle: number, main: boolean) =>
				main
					? `<rect x="27" y="4" width="10" height="15" rx="5" fill="${F}" transform="rotate(${angle} 32 32)"/>`
					: `<rect x="28" y="8" width="8" height="11" rx="4" fill="${A}" transform="rotate(${angle} 32 32)"/>`;
			return [0, 45, 90, 135, 180, 225, 270, 315].map((a, i) => petal(a, i % 2 === 0)).join("");
		})(),
	},
	{
		id: "capsule-cloud",
		name: "Capsule Cloud",
		concept:
			"A cloud that rests on an orange capsule. Capsulo runs on the free Cloudflare tier, so your site lives at the edge at no cost.",
		svg: `<circle cx="22" cy="34" r="12" fill="${F}"/><circle cx="38" cy="28" r="16" fill="${F}"/><rect x="6" y="36" width="52" height="20" rx="10" fill="${A}"/>`,
	},
	{
		id: "half-filled",
		name: "Half Filled",
		concept:
			"A tilted capsule: the top half is an empty outline and the bottom half is solid orange. It shows the framework as structure, waiting to be filled with content.",
		svg: `<g transform="translate(32 32) rotate(-30) scale(.9) translate(-32 -32)"><path d="M20 31V18a12 12 0 0 1 24 0v13z" fill="none" stroke="${F}" stroke-width="5" stroke-linejoin="round"/><path fill="${A}" d="M17.5 35.5V46a14.5 14.5 0 0 0 29 0V35.5z"/></g>`,
	},
];

/** Standalone SVG file for a proposal. `ink` fixes the neutral colour; omit it for an adaptive file that follows the OS theme (favicon-ready). */
export function standaloneSvg(proposal: LogoProposal, ink?: string): string {
	const style = ink
		? `color:${ink}`
		: undefined;
	const adaptive = ink
		? ""
		: `<style>svg{color:${LOGO_INK_LIGHT}}@media (prefers-color-scheme:dark){svg{color:${LOGO_INK_DARK}}}</style>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}"${style ? ` style="${style}"` : ""}>${adaptive}${proposal.svg}</svg>`;
}
