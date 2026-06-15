export function isSvgPath(path: string): boolean {
	return /\.svg$/i.test(path);
}

export function isSvgFile(file: File): boolean {
	return (
		file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")
	);
}

// Pretty-prints an SVG string with consistent indentation. Returns the original
// string untouched if it cannot be parsed.
export function formatSvg(svgString: string): string {
	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(svgString, "image/svg+xml");

		const parserError = doc.querySelector("parsererror");
		if (parserError) {
			return svgString;
		}

		const serializer = new XMLSerializer();
		let formatted = serializer.serializeToString(doc);

		formatted = formatted.replace(/></g, ">\n<");

		const lines = formatted.split("\n");
		let depth = 0;
		const indentedLines = lines.map((line) => {
			const trimmed = line.trim();
			if (!trimmed) return "";

			const isClosingTag = /^<\//.test(trimmed);
			const isSelfClosing = /\/>$/.test(trimmed);
			const isOpeningTag = /^<[^/!?]/.test(trimmed) && !isSelfClosing;

			if (isClosingTag) {
				depth = Math.max(0, depth - 1);
			}

			const indented = "  ".repeat(depth) + trimmed;

			if (isOpeningTag) {
				depth++;
			}

			return indented;
		});

		return indentedLines.join("\n");
	} catch {
		return svgString;
	}
}

export interface SvgValidationResult {
	valid: boolean;
	error: string | null;
}

// Validates that a string is well-formed SVG with an <svg> root element.
export function validateSvg(content: string): SvgValidationResult {
	if (!content.trim()) {
		return { valid: false, error: "SVG content cannot be empty" };
	}

	try {
		const parser = new DOMParser();
		const doc = parser.parseFromString(content, "image/svg+xml");

		const parserError = doc.querySelector("parsererror");
		if (parserError) {
			return { valid: false, error: "Invalid SVG syntax" };
		}

		if (doc.documentElement.tagName.toLowerCase() !== "svg") {
			return { valid: false, error: "Root element must be <svg>" };
		}

		return { valid: true, error: null };
	} catch {
		return { valid: false, error: "Invalid SVG format" };
	}
}
