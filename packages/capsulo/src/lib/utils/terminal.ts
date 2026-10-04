const ANSI_RESET = "\x1b[0m";

function colorize(text: string, colorCode: number): string {
	return `\x1b[38;5;${colorCode}m${text}${ANSI_RESET}`;
}

export function terminalOrange(text: string): string {
	return colorize(text, 208);
}

export function terminalGray(text: string): string {
	return colorize(text, 245);
}
