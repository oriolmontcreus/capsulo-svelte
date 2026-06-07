import { formatGlobalDisplayValue } from "$lib/globals/types";

export function formatVariablePreviewValue(
	key: string,
	value: unknown,
	knownKeys: ReadonlySet<string>
): string {
	if (!knownKeys.has(key)) return "Unknown variable";

	const displayValue = formatGlobalDisplayValue(value);
	return displayValue || "Empty";
}
