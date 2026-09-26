// Capsulo brand marks shown on /logo-proposals: the chosen Iso Box and the Orb as a backup.
//
// Both sit in a centred 48×48 square of a 64×64 viewBox. The Iso Box is drawn on a 2:1
// lattice, so the cube is exactly as wide as it is tall. Neutral tones are CSS variables
// (--i1 strong, --i2 mid) so a mark renders on light and dark backgrounds; `standaloneSvg`
// bakes them into hex for export. public/favicon.svg is the adaptive Iso Box.

export const LOGO_VIEWBOX = "0 0 64 64";

export const INK = {
	light: { "--i1": "#17171C", "--i2": "#7C7C85" },
	dark: { "--i1": "#F4F4F6", "--i2": "#8C8C95" },
} as const;
export type LogoTheme = keyof typeof INK;

export interface LogoProposal {
	id: string;
	name: string;
	concept: string;
	svg: string;
	/** The mark in use (favicon). */
	chosen?: boolean;
}

export const logoProposals: LogoProposal[] = [
	{
		id: "iso-box",
		name: "Iso Box",
		chosen: true,
		concept:
			"A capsule as a box you ship: orange lid, ink left face, mid-grey right face. Minimal, with depth from three flat shapes. Used as the favicon.",
		svg: `<path d="M32 8 56 20 32 32 8 20z" fill="#FF6900"/><path d="M8 20 32 32v24L8 44z" style="fill:var(--i1)"/><path d="M56 20 32 32v24l24-12z" style="fill:var(--i2)"/>`,
	},
	{
		id: "orb",
		name: "Orb",
		concept:
			"Backup option. An orange sphere with a deep-orange shadow: a capsule seen end-on. Two shapes, fixed colours, very recognisable at 16 px.",
		svg: `<circle cx="32" cy="32" r="24" fill="#FF6900"/><path fill="#A63D00" d="M45.7 12.3A24 24 0 1 1 12.3 45.7 24 24 0 0 0 45.7 12.3z"/>`,
	},
];

/** Standalone SVG file. With a theme the neutrals are baked in; without one the file follows the OS theme (favicon-ready). */
export function standaloneSvg(proposal: LogoProposal, theme?: LogoTheme): string {
	if (theme) {
		const ink = INK[theme];
		const body = proposal.svg.replace(/var\((--i[12])\)/g, (_, key: keyof typeof ink) => ink[key]);
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}">${body}</svg>`;
	}
	const vars = (t: LogoTheme) =>
		Object.entries(INK[t])
			.map(([k, v]) => `${k}:${v}`)
			.join(";");
	const style = `<style>svg{${vars("light")}}@media (prefers-color-scheme:dark){svg{${vars("dark")}}}</style>`;
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO_VIEWBOX}">${style}${proposal.svg}</svg>`;
}

/** Inline style for a preview tile: background plus the neutral variables. */
export function tileStyle(theme: LogoTheme): string {
	const bg = theme === "light" ? "#FFFFFF" : "#000000";
	const vars = Object.entries(INK[theme]).map(([k, v]) => `${k}:${v}`);
	return [`background:${bg}`, ...vars].join(";");
}
