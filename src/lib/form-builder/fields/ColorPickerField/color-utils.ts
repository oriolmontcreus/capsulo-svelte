export type ColorSpace = "hex" | "hsl" | "rgb";

export type ColorChannel =
	| "hue"
	| "saturation"
	| "brightness"
	| "lightness"
	| "red"
	| "green"
	| "blue";

export interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

export interface Hsva {
	h: number;
	s: number;
	v: number;
	a: number;
}

export interface Hsla {
	h: number;
	s: number;
	l: number;
	a: number;
}

export const COLOR_CHANNELS_BY_SPACE: Record<Exclude<ColorSpace, "hex">, ColorChannel[]> = {
	hsl: ["hue", "saturation", "lightness"],
	rgb: ["red", "green", "blue"],
};

const HEX_INPUT_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function isValidHexInput(hex: string): boolean {
	return HEX_INPUT_PATTERN.test(hex.trim());
}

export const CHANNEL_LABELS: Record<ColorChannel, string> = {
	hue: "H",
	saturation: "S",
	brightness: "B",
	lightness: "L",
	red: "R",
	green: "G",
	blue: "B",
};

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 0): number {
	const factor = 10 ** decimals;
	return Math.round(value * factor) / factor;
}

function componentToHex(c: number): string {
	const hex = clamp(Math.round(c), 0, 255).toString(16);
	return hex.length === 1 ? `0${hex}` : hex;
}

function rgbaToHex(rgba: Rgba, includeAlpha = false): string {
	const { r, g, b, a } = rgba;
	const base = `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
	if (!includeAlpha) return base;
	const alpha = componentToHex(a * 255);
	return `${base}${alpha}`;
}

function hexToRgba(hex: string): Rgba {
	let normalized = hex.trim().toLowerCase();
	if (!normalized.startsWith("#")) normalized = `#${normalized}`;

	const short = normalized.match(/^#([0-9a-f]{3,4})$/);
	if (short) {
		const [r, g, b, a] = short[1].split("");
		normalized = `#${r}${r}${g}${g}${b}${b}${a ? `${a}${a}` : ""}`;
	}

	const full = normalized.match(/^#([0-9a-f]{6})([0-9a-f]{2})?$/);
	if (!full) {
		return { r: 0, g: 0, b: 0, a: 1 };
	}

	const int = parseInt(full[1], 16);
	const r = (int >> 16) & 255;
	const g = (int >> 8) & 255;
	const b = int & 255;
	const a = full[2] ? parseInt(full[2], 16) / 255 : 1;

	return { r, g, b, a };
}

function rgbaToHsva(rgba: Rgba): Hsva {
	const r = rgba.r / 255;
	const g = rgba.g / 255;
	const b = rgba.b / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	let h = 0;
	if (delta !== 0) {
		if (max === r) h = ((g - b) / delta) % 6;
		else if (max === g) h = (b - r) / delta + 2;
		else h = (r - g) / delta + 4;
		h *= 60;
		if (h < 0) h += 360;
	}

	const s = max === 0 ? 0 : (delta / max) * 100;
	const v = max * 100;

	return { h, s, v, a: rgba.a };
}

function hsvaToRgba(hsva: Hsva): Rgba {
	const h = ((hsva.h % 360) + 360) % 360;
	const s = clamp(hsva.s, 0, 100) / 100;
	const v = clamp(hsva.v, 0, 100) / 100;

	const c = v * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = v - c;

	let r = 0;
	let g = 0;
	let b = 0;

	if (h < 60) {
		r = c;
		g = x;
	} else if (h < 120) {
		r = x;
		g = c;
	} else if (h < 180) {
		g = c;
		b = x;
	} else if (h < 240) {
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}

	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
		a: clamp(hsva.a, 0, 1),
	};
}

function rgbaToHsla(rgba: Rgba): Hsla {
	const r = rgba.r / 255;
	const g = rgba.g / 255;
	const b = rgba.b / 255;

	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	const delta = max - min;

	let h = 0;
	if (delta !== 0) {
		if (max === r) h = ((g - b) / delta) % 6;
		else if (max === g) h = (b - r) / delta + 2;
		else h = (r - g) / delta + 4;
		h *= 60;
		if (h < 0) h += 360;
	}

	const l = (max + min) / 2;
	const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

	return {
		h,
		s: s * 100,
		l: l * 100,
		a: rgba.a,
	};
}

function hslaToRgba(hsla: Hsla): Rgba {
	const h = ((hsla.h % 360) + 360) % 360;
	const s = clamp(hsla.s, 0, 100) / 100;
	const l = clamp(hsla.l, 0, 100) / 100;

	const c = (1 - Math.abs(2 * l - 1)) * s;
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
	const m = l - c / 2;

	let r = 0;
	let g = 0;
	let b = 0;

	if (h < 60) {
		r = c;
		g = x;
	} else if (h < 120) {
		r = x;
		g = c;
	} else if (h < 180) {
		g = c;
		b = x;
	} else if (h < 240) {
		g = x;
		b = c;
	} else if (h < 300) {
		r = x;
		b = c;
	} else {
		r = c;
		b = x;
	}

	return {
		r: Math.round((r + m) * 255),
		g: Math.round((g + m) * 255),
		b: Math.round((b + m) * 255),
		a: clamp(hsla.a, 0, 1),
	};
}

export function hsvaToHex(hsva: Hsva, includeAlpha = false): string {
	return rgbaToHex(hsvaToRgba(hsva), includeAlpha);
}

export function hexToHsva(hex: string): Hsva {
	return rgbaToHsva(hexToRgba(hex));
}

export function getChannelValue(
	hsva: Hsva,
	colorSpace: Exclude<ColorSpace, "hex">,
	channel: ColorChannel,
): number {
	if (colorSpace === "hsl") {
		const hsla = rgbaToHsla(hsvaToRgba(hsva));
		if (channel === "hue") return round(hsla.h);
		if (channel === "saturation") return round(hsla.s);
		if (channel === "lightness") return round(hsla.l);
	}

	const rgba = hsvaToRgba(hsva);
	if (channel === "red") return rgba.r;
	if (channel === "green") return rgba.g;
	if (channel === "blue") return rgba.b;

	return 0;
}

export function getChannelMax(
	colorSpace: Exclude<ColorSpace, "hex">,
	channel: ColorChannel,
): number {
	if (channel === "hue") return 360;
	if (colorSpace === "rgb") return 255;
	return 100;
}

export function setChannelValue(
	hsva: Hsva,
	colorSpace: Exclude<ColorSpace, "hex">,
	channel: ColorChannel,
	value: number,
): Hsva {
	const max = getChannelMax(colorSpace, channel);
	const clamped = clamp(value, 0, max);

	if (colorSpace === "hsl") {
		const hsla = rgbaToHsla(hsvaToRgba(hsva));
		if (channel === "hue") hsla.h = clamped;
		if (channel === "saturation") hsla.s = clamped;
		if (channel === "lightness") hsla.l = clamped;
		return rgbaToHsva(hslaToRgba(hsla));
	}

	const rgba = hsvaToRgba(hsva);
	if (channel === "red") rgba.r = clamped;
	if (channel === "green") rgba.g = clamped;
	if (channel === "blue") rgba.b = clamped;
	return rgbaToHsva(rgba);
}

export function normalizeHex(hex: string, includeAlpha: boolean): string {
	const hsva = hexToHsva(hex || "#000000");
	return hsvaToHex(hsva, includeAlpha).toLowerCase();
}

export function hueToCssColor(h: number): string {
	return `hsl(${round(h)}, 100%, 50%)`;
}

export function hsvaToAreaBackground(h: number): string {
	return `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueToCssColor(h)})`;
}

export function hsvaToCssColor(hsva: Hsva): string {
	const rgba = hsvaToRgba(hsva);
	return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${rgba.a})`;
}
