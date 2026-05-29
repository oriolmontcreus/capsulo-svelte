export interface HighlightSegment {
	text: string;
	highlighted: boolean;
}

export function splitHighlightSegments(
	text: string,
	query: string,
	enabled: boolean,
): HighlightSegment[] {
	const normalizedQuery = query.trim();
	if (!enabled || normalizedQuery.length === 0) {
		return [{ text, highlighted: false }];
	}

	const lowerText = text.toLowerCase();
	const lowerQuery = normalizedQuery.toLowerCase();
	const index = lowerText.indexOf(lowerQuery);
	if (index === -1) {
		return [{ text, highlighted: false }];
	}

	const segments: HighlightSegment[] = [];
	if (index > 0) {
		segments.push({ text: text.slice(0, index), highlighted: false });
	}
	segments.push({
		text: text.slice(index, index + normalizedQuery.length),
		highlighted: true,
	});
	const remainder = text.slice(index + normalizedQuery.length);
	if (remainder.length > 0) {
		segments.push({ text: remainder, highlighted: false });
	}
	return segments;
}
