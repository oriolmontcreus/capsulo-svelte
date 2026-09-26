// Temporary brand exploration for /logo-proposals (rounds 2 and 3).
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

export type LogoGroup = "round3-beyond" | "round3-box" | "round2";

export interface LogoProposal {
	group: LogoGroup;
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
	projection?: Projection;
}

type Projection = "dimetric" | "oblique";

const PROJECT: Record<Projection, (p: P3) => P2> = {
	// 2:1 dimetric: x runs to the lower right, y to the lower left, z straight up.
	dimetric: ([x, y, z]) => [x - y, (x + y) / 2 - z],
	// 45° oblique: x/y lie in the page, z rises toward the viewer and shifts up-left.
	oblique: ([x, y, z]) => [x - z, y - z],
};

// Direction toward the viewer for each projection (the projection's null vector).
const VIEW: Record<Projection, P3> = { dimetric: [1, 1, 1], oblique: [1, 1, 1] };

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

function render(
	parts: Part[],
	{ size = 48, gap = 0, radius = 0, strokeWidth = 0, projection = "dimetric" }: RenderOptions = {},
): string {
	const project = PROJECT[projection];
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


// ---------------------------------------------------------------------------------------
// Round 3 helpers: extruded outlines, a squareness solver and a few flat shapes.

type Axis = "x" | "y" | "z";
interface AxisTones {
	x?: string;
	y?: string;
	z?: string;
}

const STANDARD_AXES: AxisTones = { z: A, y: I1, x: I2 };

function stadium(a: number, r: number, segments = 16): P2[] {
	const pts: P2[] = [];
	for (let i = 0; i <= segments; i++) {
		const t = -Math.PI / 2 + (Math.PI * i) / segments;
		pts.push([a + r * Math.cos(t), r * Math.sin(t)]);
	}
	for (let i = 0; i <= segments; i++) {
		const t = Math.PI / 2 + (Math.PI * i) / segments;
		pts.push([-a + r * Math.cos(t), r * Math.sin(t)]);
	}
	return pts;
}

function roundedSquare(half: number, r: number, segments = 8): P2[] {
	const pts: P2[] = [];
	const c = half - r;
	const corners: P2[] = [[c, c], [-c, c], [-c, -c], [c, -c]];
	corners.forEach(([cx, cy], k) => {
		for (let i = 0; i <= segments; i++) {
			const t = (Math.PI / 2) * (k + i / segments);
			pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]);
		}
	});
	return pts;
}

/**
 * Extrudes a convex outline. `u`, `v` are the outline's axes in world space and `w` the
 * extrusion axis (all unit vectors, mutually perpendicular). Side facets facing the viewer
 * take the tone of their dominant axis; runs of equal tone merge into one band polygon.
 */
function prism(
	outline: P2[],
	{ origin = [0, 0, 0] as P3, u, v, w, depth, tones = STANDARD_AXES, projection = "dimetric" as Projection }: {
		origin?: P3;
		u: P3;
		v: P3;
		w: P3;
		depth: number;
		tones?: AxisTones;
		projection?: Projection;
	},
): Part[] {
	const view = VIEW[projection];
	const dot = (a: P3, b: P3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
	const at = ([pu, pv]: P2, pw: number): P3 => [
		origin[0] + pu * u[0] + pv * v[0] + pw * w[0],
		origin[1] + pu * u[1] + pv * v[1] + pw * w[1],
		origin[2] + pu * u[2] + pv * v[2] + pw * w[2],
	];
	// Dominant axis of a normal; ties go to z, then y, so a face at exactly 45° reads as the left face.
	const toneOf = ([nx, ny, nz]: P3): string | undefined => {
		const ranked: [Axis, number][] = [["z", nz], ["y", ny], ["x", nx]];
		const [axis] = ranked.reduce((best, cur) => (cur[1] > best[1] + 1e-9 ? cur : best));
		return tones[axis];
	};

	let area = 0;
	outline.forEach(([x1, y1], i) => {
		const [x2, y2] = outline[(i + 1) % outline.length];
		area += x1 * y2 - x2 * y1;
	});
	const sign = Math.sign(area);
	const capAtDepth = dot(w, view) > 0;
	const capW = capAtDepth ? depth : 0;
	const baseW = capAtDepth ? 0 : depth;

	const facets = outline.map((p, i) => {
		const q = outline[(i + 1) % outline.length];
		const du = q[0] - p[0];
		const dv = q[1] - p[1];
		const nu = sign * dv;
		const nv = -sign * du;
		const normal: P3 = [nu * u[0] + nv * v[0], nu * u[1] + nv * v[1], nu * u[2] + nv * v[2]];
		return dot(normal, view) > 1e-9 ? toneOf(normal) ?? null : null;
	});

	const len = outline.length;
	const start = facets.findIndex((tone, i) => tone !== facets[(i - 1 + len) % len]);
	const parts: Part[] = [];
	if (start >= 0) {
		let i = start;
		for (let count = 0; count < len; ) {
			const tone = facets[i];
			let j = i;
			while (count < len && facets[j % len] === tone) {
				j++;
				count++;
			}
			if (tone) {
				const top: P3[] = [];
				const bottom: P3[] = [];
				for (let k = i; k <= j; k++) {
					top.push(at(outline[k % len], capW));
					bottom.push(at(outline[k % len], baseW));
				}
				parts.push({ fill: tone, polys: [[...top, ...bottom.reverse()]] });
			}
			i = j % len;
		}
	}
	const capNormal: P3 = capAtDepth ? w : [-w[0], -w[1], -w[2]];
	const capTone = toneOf(capNormal);
	if (capTone) parts.push({ fill: capTone, polys: [outline.map((p) => at(p, capW))] });
	return parts;
}

/** Bisects `param` in [lo, hi] until the projected silhouette of `build(param)` is square. */
function solveSquare(build: (param: number) => Part[], lo: number, hi: number, projection: Projection = "dimetric"): number {
	const project = PROJECT[projection];
	const aspect = (t: number) => {
		const pts = build(t).flatMap((part) => part.polys.flat().map(project));
		const xs = pts.map((p) => p[0]);
		const ys = pts.map((p) => p[1]);
		return Math.max(...xs) - Math.min(...xs) - (Math.max(...ys) - Math.min(...ys));
	};
	const fLo = aspect(lo);
	for (let i = 0; i < 60; i++) {
		const mid = (lo + hi) / 2;
		if (Math.sign(aspect(mid)) === Math.sign(fLo)) lo = mid;
		else hi = mid;
	}
	return (lo + hi) / 2;
}

const X: P3 = [1, 0, 0];
const Y: P3 = [0, 1, 0];
const Z: P3 = [0, 0, 1];
const D1: P3 = [Math.SQRT1_2, -Math.SQRT1_2, 0];
const D2: P3 = [Math.SQRT1_2, Math.SQRT1_2, 0];

const longShadowPill = render(
	prism(stadium(0.62, 0.42), { u: D1, v: D2, w: Z, depth: 0.32, projection: "oblique", tones: { z: A, y: I1, x: I2 } }),
	{ projection: "oblique" },
);

const keycap = render(
	prism(roundedSquare(0.5, 0.2), { u: X, v: Y, w: Z, depth: 0.16, projection: "oblique", tones: { z: A, y: I1, x: I2 } }),
	{ projection: "oblique" },
);

const pillBlock = (() => {
	const build = (depth: number) => prism(roundedSquare(0.5, 0.28), { origin: [0.5, 0.5, 0], u: X, v: Y, w: Z, depth });
	return render(build(solveSquare(build, 0.2, 3)));
})();

const peak = (() => {
	const build = (h: number): Part[] => [
		{ fill: A, polys: [[[0, 1, 0], [1, 1, 0], [0.5, 0.5, h]]] },
		{ fill: A3, polys: [[[1, 0, 0], [1, 1, 0], [0.5, 0.5, h]]] },
	];
	return render(build(solveSquare(build, 0.6, 4)));
})();

const chamfer = (() => {
	const c = 0.38;
	return render([
		{ fill: A, polys: [[[0, 0, 1], [1, 0, 1], [1, 1 - c, 1], [1 - c, 1, 1], [0, 1, 1]]] },
		{ fill: I1, polys: [[[0, 1, 1], [1 - c, 1, 1], [1, 1, 1 - c], [1, 1, 0], [0, 1, 0]]] },
		{ fill: I2, polys: [[[1, 0, 1], [1, 1 - c, 1], [1, 1, 1 - c], [1, 1, 0], [1, 0, 0]]] },
		{ fill: "#FF9A5C", polys: [[[1 - c, 1, 1], [1, 1 - c, 1], [1, 1, 1 - c]]] },
	]);
})();

const slotBox = render([
	...box(unit),
	{ fill: A3, polys: [stadium(0.2, 0.085).map(([pu, pv]): P3 => [0.5 + pu * D1[0] + pv * D2[0], 0.5 + pu * D1[1] + pv * D2[1], 1])] },
]);

const foldedPage = render(
	[
		{ fill: I1, polys: [[[0, 0, 0], [0.64, 0, 0], [1, 0.36, 0], [1, 1, 0], [0, 1, 0]]] },
		{ fill: A, polys: [[[0.64, 0, 0], [0.64, 0.36, 0], [1, 0.36, 0]]] },
	],
	{ projection: "oblique", radius: 2.5 },
);

const bevelButton = [
	`<path fill="#FF9A5C" d="M8 8h48L44 20H20z"/>`,
	`<path fill="#FF7B1C" d="M8 8l12 12v24L8 56z"/>`,
	`<path fill="${A2}" d="M56 8v48L44 44V20z"/>`,
	`<path fill="${A3}" d="M8 56l12-12h24l12 12z"/>`,
	`<rect x="20" y="20" width="24" height="24" fill="${A}"/>`,
].join("");

const capsuleSlot = [
	`<rect x="8" y="8" width="48" height="48" rx="12" style="fill:${I1}"/>`,
	`<rect x="16" y="24" width="32" height="16" rx="8" fill="${A3}"/>`,
	`<rect x="17" y="27" width="30" height="12" rx="6" fill="${A}"/>`,
].join("");

const leafFold = [
	`<path fill="${A}" d="M56 8H28A20 20 0 0 0 8 28v28z"/>`,
	`<path fill="${A3}" d="M56 8v28a20 20 0 0 1-20 20H8z"/>`,
].join("");

const orb = [
	`<circle cx="32" cy="32" r="24" fill="${A}"/>`,
	`<path fill="${A3}" d="M45.7 12.3A24 24 0 1 1 12.3 45.7 24 24 0 0 0 45.7 12.3z"/>`,
].join("");

const splitOrb = [
	`<path fill="${A}" d="M47.88 14A24 24 0 0 0 14 47.88z"/>`,
	`<path style="fill:${I1}" d="M50 16.12A24 24 0 0 1 16.12 50z"/>`,
].join("");

const stackedTiles = [
	`<rect x="8" y="8" width="36" height="36" rx="10" style="fill:${I1}"/>`,
	`<rect x="20" y="20" width="36" height="36" rx="10" fill="${A}"/>`,
].join("");

const twinCapsules = [
	`<rect x="18" y="4" width="16" height="44" rx="8" style="fill:${I1}" transform="rotate(45 26 26)"/>`,
	`<rect x="30" y="16" width="16" height="44" rx="8" fill="${A}" transform="rotate(45 38 38)"/>`,
].join("");

// An upright capsule end: hemisphere over a short cylinder, split into the two side tones.
const dome = [
	`<path style="fill:${I1}" d="M8 32v12a24 12 0 0 0 24 12V44A24 12 0 0 1 8 32z"/>`,
	`<path style="fill:${I2}" d="M56 32v12a24 12 0 0 1-24 12V44a24 12 0 0 0 24-12z"/>`,
	`<path fill="${A}" d="M8 32a24 24 0 0 1 48 0 24 12 0 0 1-48 0z"/>`,
].join("");

type ProposalInput = Omit<LogoProposal, "group">;

const round3Beyond: ProposalInput[] = [

	{
		id: "dome",
		name: "Dome",
		concept:
			"The end of an upright capsule: an orange half-sphere on a short two-tone cylinder. Soft, round and still clearly three-dimensional.",
		svg: dome,
	},
	{
		id: "long-shadow-pill",
		name: "Raised Pill",
		concept:
			"A diagonal orange pill lifted off the page, with its thickness showing to the lower right. The capsule as a solid object, seen from the front instead of from an angle.",
		svg: longShadowPill,
	},
	{
		id: "keycap",
		name: "Keycap",
		concept:
			"A rounded square raised like a key, orange on top. Publishing is one press. Very simple, and it works as an app icon without a background tile.",
		svg: keycap,
	},
	{
		id: "bevel-button",
		name: "Bevel",
		concept:
			"A square block seen from above, with four bevelled edges lit from the top left. All orange, so it looks the same on any background.",
		svg: bevelButton,
	},
	{
		id: "peak",
		name: "Peak",
		concept:
			"A pyramid in the same projection as the cube: one lit face and one shaded face. Build, then ship. It keeps the depth and loses the box.",
		svg: peak,
	},
	{
		id: "capsule-slot",
		name: "Capsule Slot",
		concept:
			"An orange pill pressed into a tile, with a shadow along its top edge. A slot where your content goes; depth through a recess instead of an extrusion.",
		svg: capsuleSlot,
	},
	{
		id: "folded-page",
		name: "Folded Page",
		concept:
			"A page with its corner folded over in orange. Content, with the depth coming from one fold. The most \"CMS\" of the set, and also the most conventional.",
		svg: foldedPage,
	},
	{
		id: "leaf-fold",
		name: "Leaf Fold",
		concept:
			"A square with two rounded corners, halfway between a square and a capsule, folded along its diagonal into two orange tones. Theme-independent.",
		svg: leafFold,
	},
	{
		id: "orb",
		name: "Orb",
		concept:
			"An orange sphere with a deep-orange shadow: a capsule seen end-on. Just two shapes. The meaning is loose, but it's very recognisable at 16 px.",
		svg: orb,
	},
	{
		id: "split-orb",
		name: "Split Orb",
		concept:
			"A circle split along its diagonal into an orange half and an ink half: the split pill seen end-on. Content and code again, as a round mark.",
		svg: splitOrb,
	},
	{
		id: "stacked-tiles",
		name: "Stacked Tiles",
		concept:
			"Two offset tiles, ink behind orange. Layers: drafts under the published page. Depth from overlap only; flat and quiet.",
		svg: stackedTiles,
	},
	{
		id: "twin-capsules",
		name: "Twin Capsules",
		concept:
			"Two diagonal pills, the orange one in front of the ink one. Like the split pill from round 1, but read as two layers instead of two halves.",
		svg: twinCapsules,
	},

];

const round3Box: ProposalInput[] = [
	{
		id: "chamfer",
		name: "Chamfer",
		concept:
			"The cube with its nearest corner cut off, which leaves a small light facet facing you in the centre. One detail that makes it feel machined.",
		svg: chamfer,
	},
	{
		id: "pill-block",
		name: "Pill Block",
		concept:
			"A block with a rounded-square footprint: a cube with soft vertical edges. The shading rolls around the front corner instead of splitting sharply.",
		svg: pillBlock,
	},
	{
		id: "slot-box",
		name: "Slot Box",
		concept:
			"The Iso Box with a capsule-shaped slot in its lid: drop your content in. The slot disappears at 16 px, which leaves a clean cube.",
		svg: slotBox,
	},
	{
		id: "seamed-tonal",
		name: "Seamed Tonal",
		concept:
			"The seamed cube in orange shades only. Single colour, so there's no theme variant, and the seams keep it crisp.",
		svg: render(box(unit, { top: A, left: A3, right: A2 }), { gap: 3.5 }),
	},
	{
		id: "round-badge",
		name: "Round Badge",
		concept:
			"The cube on an orange circle, for avatars and social profiles where round crops are the norm.",
		svg: `<circle cx="32" cy="32" r="28" fill="${A}"/>${render(box(unit, { top: "#FFFFFF", left: A3, right: "#C44A00" }), { size: 28 })}`,
	},
];

const round2: ProposalInput[] = [
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

export const logoProposals: LogoProposal[] = [
	...round3Beyond.map((p) => ({ ...p, group: "round3-beyond" as const })),
	...round3Box.map((p) => ({ ...p, group: "round3-box" as const })),
	...round2.map((p) => ({ ...p, group: "round2" as const })),
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
