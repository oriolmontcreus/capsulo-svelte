/** Shared argument checks for field builders: schema mistakes fail when the schema loads. */

export function assertNonNegativeInteger(method: string, value: number): void {
	if (!Number.isInteger(value) || value < 0) {
		throw new RangeError(`${method}() needs a non-negative integer, got ${value}.`);
	}
}

export function assertRange(
	owner: string,
	lowName: string,
	low: number | undefined,
	highName: string,
	high: number | undefined,
): void {
	if (low !== undefined && high !== undefined && low > high) {
		throw new RangeError(`${owner} has ${lowName} ${low} above ${highName} ${high}.`);
	}
}

export function assertValidRegex(method: string, value: string | RegExp): void {
	if (value instanceof RegExp) return;
	try {
		new RegExp(value);
	} catch (error) {
		throw new SyntaxError(`${method}() got an invalid pattern: ${(error as Error).message}`);
	}
}
