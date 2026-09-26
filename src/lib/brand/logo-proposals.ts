// Temporary brand exploration for /logo-proposals (round 2: Iso Box variants).
//
// Every mark is built from 3D boxes projected on a 2:1 dimetric lattice, where a cube's
// silhouette is exactly as wide as it is tall. The projection is then fitted into a centred
// 48×48 square of a 64×64 viewBox, so all marks share the same footprint and margins.
//
// Neutral tones are CSS variables (--i1 strongest, --i2 mid, --i3 soft) so each mark
// renders on light and dark backgrounds; `standaloneSvg` bakes them into hex for export.

export const LOGO_VIEWBOX = "0 0 64 64";

export const INK = {
	light: { "--i1": "#17171C", "--i2": "#7C7C85", "--i3": "#C9C9D1" },
	dark: { "--i1": "#F4F4F6", "--i2": "#8C8C95", "--i3": "#45454D" },
} as const;
export type LogoTheme = keyof typeof INK;

export interface LogoProposal {
	id: string;
	name: string;
	concept: string;
	svg: string;
	/** Round-1 mark kept on the page for comparison. */
	reference?: boolean;
}

// Palette: brand orange and two deeper shades for side faces.
const A = "#FF6900";
const A2 = "#D65400";
const A3 = "#A63D00";
const I1 = "var(--i1)";
const I2 = "var(--i2)";
const I3 = "var(--i3)";

type P3 = [number, number, number];
type P2 = [number, number];

interface Part {
	polys: P3[][];
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	evenodd?: boolean;
}

interface RenderOptions {
	/** Side of the square the mark is fitted into. */
	size?: number;
	/** Even gap between faces, in final units. */
	gap?: number;
	/** Corner radius of every face, in final units. */
	radius?: number;
	/** Stroke width of outline parts; the geometry shrinks so the stroke stays inside `size`. */
	strokeWidth?: number;
}

// 2:1 dimetric: x runs to the lower right, y to the lower left, z straight up.
const project = ([x, y, z]: P3): P2 => [x - y, (x + y) / 2 - z];

const n = (v: number) => String(Math.round(v * 100) / 100);

// Moves each edge of a simple polygon inward by its own distance (mitred corners).
function inset(poly: P2[], distances: number[]): P2[] {
	if (distances.every((d) => !d)) return poly;
	const len = poly.length;
	let area = 0;
	for (let i = 0; i < len; i++) {
		const [x1, y1] = poly[i];
		const [x2, y2] = poly[(i + 1) % len];
		area += x1 * y2 - x2 * y1;
	}
	const sign = Math.sign(area);
	const lines = poly.map((p, i) => {
		const q = poly[(i + 1) % len];
		const dx = q[0] - p[0];
		const dy = q[1] - p[1];
		const l = Math.hypot(dx, dy);
		const d = distances[i];
		return { p: [p[0] + ((sign * -dy) / l) * d, p[1] + ((sign * dx) / l) * d] as P2, v: [dx, dy] as P2 };
	});
	return lines.map((cur, i) => {
		const prev = lines[(i - 1 + len) % len];
		const cross = prev.v[0] * cur.v[1] - prev.v[1] * cur.v[0];
		if (Math.abs(cross) < 1e-9) return cur.p;
		const wx = cur.p[0] - prev.p[0];
		const wy = cur.p[1] - prev.p[1];
		const t = (wx * cur.v[1] - wy * cur.v[0]) / cross;
		return [prev.p[0] + prev.v[0] * t, prev.p[1] + prev.v[1] * t];
	});
}

const samePoint = (a: P2, b: P2) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

function render(parts: Part[], { size = 48, gap = 0, radius = 0, strokeWidth = 0 }: RenderOptions = {}): string {
	const flat = parts.flatMap((part) => part.polys.flatMap((poly) => poly.map(project)));
	const xs = flat.map((p) => p[0]);
	const ys = flat.map((p) => p[1]);
	const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
	const scale = (size - strokeWidth) / Math.max(maxX - minX, maxY - minY);
	const ox = 32 - ((minX + maxX) / 2) * scale;
	const oy = 32 - ((minY + maxY) / 2) * scale;
	const toScreen = (p: P3): P2 => {
		const [x, y] = project(p);
		return [x * scale + ox, y * scale + oy];
	};

	// Gaps open only along edges two faces share, so the outer silhouette keeps its full size.
	const projected = parts.map((part) => part.polys.map((poly) => poly.map(toScreen)));
	const edges = projected.flat().flatMap((poly) => poly.map((p, i) => [p, poly[(i + 1) % poly.length]] as const));
	const shared = (a: P2, b: P2) =>
		edges.filter(([p, q]) => (samePoint(p, a) && samePoint(q, b)) || (samePoint(p, b) && samePoint(q, a))).length > 1;

	const shapes = projected.map((polys, partIndex) =>
		polys.map((poly) =>
			inset(
				poly,
				poly.map((p, i) =>
					parts[partIndex].stroke ? 0 : radius + (gap && shared(p, poly[(i + 1) % poly.length]) ? gap / 2 : 0),
				),
			),
		),
	);

	// Seams and rounded corners nibble the outer points; stretch the points back so the
	// finished shape (including the rounding stroke) fills the square exactly.
	if (gap || radius) {
		const pts = shapes.flat(2);
		const fit = (axis: 0 | 1) => {
			const lo = Math.min(...pts.map((p) => p[axis])) - radius;
			const hi = Math.max(...pts.map((p) => p[axis])) + radius;
			const k = (size - 2 * radius) / (hi - lo - 2 * radius);
			return (v: number) => 32 + (v - (lo + hi) / 2) * k;
		};
		const [fx, fy] = [fit(0), fit(1)];
		for (const p of pts) [p[0], p[1]] = [fx(p[0]), fy(p[1])];
	}

	return parts
		.map((part, partIndex) => {
			const d = shapes[partIndex].map((pts) => `M${pts.map(([x, y]) => `${n(x)} ${n(y)}`).join("L")}Z`).join("");
			const style = [
				`fill:${part.fill ?? "none"}`,
				part.stroke && `stroke:${part.stroke}`,
				!part.stroke && radius && part.fill && `stroke:${part.fill}`,
			]
				.filter(Boolean)
				.join(";");
			const width = part.stroke ? part.strokeWidth ?? strokeWidth : radius ? radius * 2 : 0;
			const strokeAttrs = width ? ` stroke-width="${n(width)}" stroke-linejoin="round"` : "";
			return `<path d="${d}"${part.evenodd ? ' fill-rule="evenodd"' : ""} style="${style}"${strokeAttrs}/>`;
		})
		.join("");
}

// The three visible faces of an axis-aligned box.
function faces(x: number, y: number, z: number, w: number, d: number, h: number) {
	const t = z + h;
	return {
		top: [[x, y, t], [x + w, y, t], [x + w, y + d, t], [x, y + d, t]] as P3[],
		left: [[x, y + d, t], [x + w, y + d, t], [x + w, y + d, z], [x, y + d, z]] as P3[],
		right: [[x + w, y, t], [x + w, y + d, t], [x + w, y + d, z], [x + w, y, z]] as P3[],
	};
}

interface Tones {
	top?: string;
	left?: string;
	right?: string;
}

const STANDARD: Tones = { top: A, left: I1, right: I2 };

function box(b: [number, number, number, number, number, number], tones: Tones = STANDARD): Part[] {
	const f = faces(...b);
	return (["top", "left", "right"] as const)
		.filter((key) => tones[key])
		.map((key) => ({ polys: [f[key]], fill: tones[key] }));
}

const unit: [number, number, number, number, number, number] = [0, 0, 0, 1, 1, 1];

// A cube with its front-top corner cell removed. Faces are merged per orientation so the
// lighting stays consistent: every upward face orange, every left face ink, every right face mid.
function notchedCube(tones: Tones = STANDARD): Part[] {
	const h = 0.5;
	return [
		{
			fill: tones.top,
			polys: [
				[[0, 0, 1], [1, 0, 1], [1, h, 1], [h, h, 1], [h, 1, 1], [0, 1, 1]],
				[[h, h, h], [1, h, h], [1, 1, h], [h, 1, h]],
			],
		},
		{
			fill: tones.left,
			polys: [
				[[0, 1, 1], [h, 1, 1], [h, 1, h], [1, 1, h], [1, 1, 0], [0, 1, 0]],
				[[h, h, 1], [1, h, 1], [1, h, h], [h, h, h]],
			],
		},
		{
			fill: tones.right,
			polys: [
				[[1, 0, 1], [1, h, 1], [1, h, h], [1, 1, h], [1, 1, 0], [1, 0, 0]],
				[[h, h, 1], [h, 1, 1], [h, 1, h], [h, h, h]],
			],
		},
	];
}

function deepBox(): Part[] {
	const t = 0.14;
	const f = faces(...unit);
	const opening: P3[] = [[t, t, 1], [1 - t, t, 1], [1 - t, 1 - t, 1], [t, 1 - t, 1]];
	return [
		// Inner back walls, drawn first; the rim and outer faces cover what hangs below the opening.
		{ fill: A3, polys: [[[t, t, 1], [1 - t, t, 1], [1 - t, t, 2 * t], [t, t, 2 * t]]] },
		{ fill: A2, polys: [[[t, t, 1], [t, 1 - t, 1], [t, 1 - t, 2 * t], [t, t, 2 * t]]] },
		{ fill: A, polys: [f.top, opening], evenodd: true },
		{ fill: I1, polys: [f.left] },
		{ fill: I2, polys: [f.right] },
	];
}

function modules(): Part[] {
	const s = 0.45;
	const cells: P3[] = [];
	for (const x of [0, 0.55]) for (const y of [0, 0.55]) for (const z of [0, 0.55]) cells.push([x, y, z]);
	cells.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
	return cells.flatMap(([x, y, z]) => box([x, y, z, s, s, s]));
}

function steps(): Part[] {
	return [2, 4 / 3, 2 / 3].flatMap((h, i) => box([i, 0, 0, 1, 1, h]));
}

function tile(background: string, cube: Tones): string {
	return `<rect x="4" y="4" width="56" height="56" rx="14" fill="${background}"/>${render(box(unit, cube), { size: 30 })}`;
}

// A vertical cylinder in the same projection: the top ellipse is 2:1, and the body is as tall
// as the ellipse is wide minus its own height, so the silhouette is 48×48.
const canister = [
	`<path style="fill:${I1}" d="M8 20v24a24 12 0 0 0 24 12V32A24 12 0 0 1 8 20z"/>`,
	`<path style="fill:${I2}" d="M56 20v24a24 12 0 0 1-24 12V32a24 12 0 0 0 24-12z"/>`,
	`<ellipse cx="32" cy="20" rx="24" ry="12" fill="${A}"/>`,
].join("");

export const logoProposals: LogoProposal[] = [
	{
		id: "reference-iso-box",
		name: "Iso Box (round 1)",
		reference: true,
		concept:
			"The round-1 mark, for comparison. It uses true isometric, so its silhouette is a hexagon about 42×48: slightly taller than wide. Every variant below is redrawn on a squared lattice.",
		svg: `<g stroke-linejoin="round" stroke-width="3"><path fill="${A}" stroke="${A}" d="M32 7.5 53 19.5 32 31.5 11 19.5z"/><path fill="currentColor" stroke="currentColor" d="M11 23v21.5L30 55.5V34z"/><path fill="currentColor" stroke="currentColor" opacity=".55" d="M53 23v21.5L34 55.5V34z"/></g>`,
	},
	{
		id: "iso-box",
		name: "Iso Box",
		concept:
			"The mark you picked, redrawn at 2:1 so it's exactly as wide as it is tall. Orange lid, ink left face, mid-grey right face: the lighting rule that every variant below follows.",
		svg: render(box(unit)),
	},
	{
		id: "seamed",
		name: "Seamed",
		concept:
			"The same cube with an even channel between its faces. The gaps come from the geometry, not a background-coloured stroke, so they work on any surface. Crisper and more engineered.",
		svg: render(box(unit), { gap: 3 }),
	},
	{
		id: "soft",
		name: "Soft Box",
		concept:
			"Seamed, with slightly rounded corners on every face. Friendlier and closer to an app icon, while keeping the depth.",
		svg: render(box(unit), { gap: 3.5, radius: 2 }),
	},
	{
		id: "two-tone",
		name: "Two-Tone",
		concept:
			"Both sides in the same ink, with depth carried only by the seams. The quietest version: one neutral, one orange.",
		svg: render(box(unit, { top: A, left: I1, right: I1 }), { gap: 3.5 }),
	},
	{
		id: "open-lid",
		name: "Open Lid",
		concept:
			"The lid is lifted off the box. A capsule being opened: your content is in there, one step from being shipped.",
		svg: render([...box([0, 0, 0, 1, 1, 0.72], { left: I1, right: I2 }), ...box([0, 0, 0.84, 1, 1, 0.16], { top: A, left: A3, right: A2 })]),
	},
	{
		id: "deep-box",
		name: "Deep Box",
		concept:
			"An open-top container with a glowing orange inside. The capsule as something you fill: the framework is the box and the content is the core.",
		svg: render(deepBox()),
	},
	{
		id: "tonal",
		name: "Tonal",
		concept:
			"All three faces in orange shades. It's a single colour, so it looks the same on white, black or a photo, with no theme variant needed.",
		svg: render(box(unit, { top: A, left: A3, right: A2 })),
	},
	{
		id: "mono",
		name: "Mono",
		concept:
			"Three neutral tones, no orange. For places where colour isn't allowed: docs, embossing, a monochrome footer.",
		svg: render(box(unit, { top: I3, left: I1, right: I2 })),
	},
	{
		id: "dark-lid",
		name: "Dark Lid",
		concept:
			"The colours flipped: an ink lid over orange sides. More weight at the top, and a warmer, bolder silhouette.",
		svg: render(box(unit, { top: I1, left: A2, right: A })),
	},
	{
		id: "layers",
		name: "Layers",
		concept:
			"The cube cut into three slabs. A page is built in layers of capsules, and the orange is always the top one, the one you see.",
		svg: render([0, 0.36, 0.72].flatMap((z, i) => box([0, 0, z, 1, 1, 0.28], i === 2 ? STANDARD : { left: I1, right: I2 }))),
	},
	{
		id: "split",
		name: "Split",
		concept:
			"The cube cut into two halves with a narrow slit, giving it depth from the inside. Content and code: two halves of one object.",
		svg: render([...box([0, 0, 0, 0.44, 1, 1]), ...box([0.56, 0, 0, 0.44, 1, 1])]),
	},
	{
		id: "modules",
		name: "Modules",
		concept:
			"Eight small cubes form one big cube. The site is made of capsules and each one is self-contained. Busier at 16 px than the solid versions.",
		svg: render(modules()),
	},
	{
		id: "notch",
		name: "Notch",
		concept:
			"A cube with its front corner taken out, lit the same way as the rest. It says there's a slot for your piece, and it stays solid at 16 px.",
		svg: render(notchedCube()),
	},
	{
		id: "keystone",
		name: "Keystone",
		concept:
			"A neutral cube with an orange capsule sitting in its notch. The framework holds the content, and the content is what stands out.",
		svg: render([...notchedCube({ top: I3, left: I1, right: I2 }), ...box([0.55, 0.55, 0.5, 0.4, 0.4, 0.4], { top: A, left: A3, right: A2 })]),
	},
	{
		id: "outline",
		name: "Outline",
		concept:
			"The line version: the sides as strokes, the lid filled orange. Lighter on the page, and a good match for line-style UI icons.",
		svg: render(
			[
				...box(unit, { left: I1, right: I1 }).map((p) => ({ ...p, fill: undefined, stroke: p.fill })),
				{ polys: [faces(...unit).top], fill: A, stroke: A },
			],
			{ strokeWidth: 4 },
		),
	},
	{
		id: "encapsulated",
		name: "Encapsulated",
		concept:
			"A clear box holding a solid orange cube: the most literal \"capsule\". The outline is the framework, and what's inside is yours.",
		svg: render(
			[
				{ polys: [[[0, 0, 1], [1, 0, 1], [1, 0, 0], [1, 1, 0], [0, 1, 0], [0, 1, 1]]], stroke: I1 },
				...box([0.25, 0.25, 0.25, 0.5, 0.5, 0.5], { top: A, left: A3, right: A2 }),
			],
			{ strokeWidth: 4 },
		),
	},
	{
		id: "steps",
		name: "Steps",
		concept:
			"Three blocks rising toward the back: build, preview, publish. Same faces and lighting, arranged as progress.",
		svg: render(steps()),
	},
	{
		id: "canister",
		name: "Canister",
		concept:
			"The capsule as a round container in the same projection. It's softer than the cube, and still lit like the other variants: orange top, ink left, mid right.",
		svg: canister,
	},
	{
		id: "tile-orange",
		name: "Orange Tile",
		concept:
			"The cube on an orange app tile, with a white lid and deep-orange sides. Fixed colours, so it looks the same everywhere: favicon, dock, social avatar.",
		svg: tile(A, { top: "#FFFFFF", left: A3, right: "#C44A00" }),
	},
	{
		id: "tile-dark",
		name: "Dark Tile",
		concept:
			"The standard cube on a near-black tile. It pairs with the orange tile and stands out on light pages without looking heavy on dark ones.",
		svg: tile("#17171C", { top: A, left: "#F4F4F6", right: "#8C8C95" }),
	},
];

/** Standalone SVG file. With a theme the neutrals are baked in; without one the file follows the OS theme (favicon-ready). */
export function standaloneSvg(proposal: LogoProposal, theme?: LogoTheme): string {
	const vars = (t: LogoTheme) =>
		Object.entries(INK[t])
			.map(([k, v]) => `${k}:${v}`)
			.concat(`color:${INK[t]["--i1"]}`)
			.join(";");
	if (theme) {
		const ink = INK[theme];
		const body = proposal.svg.replace(/var\((--i[123])\)/g, (_, key: keyof typeof ink) => ink[key]);
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}" style="color:${ink["--i1"]}">${body}</svg>`;
	}
	const style = `<style>svg{${vars("light")}}@media (prefers-color-scheme:dark){svg{${vars("dark")}}}</style>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}">${style}${proposal.svg}</svg>`;
}

/** Inline style for a preview tile: background plus the neutral variables. */
export function tileStyle(theme: LogoTheme): string {
	const bg = theme === "light" ? "#FFFFFF" : "#000000";
	const vars = Object.entries(INK[theme]).map(([k, v]) => `${k}:${v}`);
	return [`background:${bg}`, `color:${INK[theme]["--i1"]}`, ...vars].join(";");
}
