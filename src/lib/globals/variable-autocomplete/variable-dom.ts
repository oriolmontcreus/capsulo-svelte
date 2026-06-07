const VARIABLE_TOKEN_PATTERN = /(\{\{[^}]+\}\})/g;

export function parseVariableSegments(value: string): Array<
	| { type: "text"; value: string }
	| { type: "variable"; name: string; token: string }
> {
	if (!value) return [];

	const segments: Array<
		| { type: "text"; value: string }
		| { type: "variable"; name: string; token: string }
	> = [];

	for (const part of value.split(VARIABLE_TOKEN_PATTERN)) {
		if (!part) continue;

		const match = part.match(/^\{\{([^}]+)\}\}$/);
		if (match) {
			segments.push({
				type: "variable",
				name: match[1].trim(),
				token: part
			});
			continue;
		}

		segments.push({ type: "text", value: part });
	}

	return segments;
}

export function getVariableNodeClassName(): string {
	return "variable-node mx-0.5 inline cursor-help rounded px-0.5 font-medium text-primary transition-all duration-150 ease-in-out hover:bg-primary/10";
}
