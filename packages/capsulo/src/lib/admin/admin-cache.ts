/**
 * The admin keeps the last data each page showed in module memory, which the client router
 * preserves between admin pages: a page revisited renders it at once and revalidates in the
 * background. Nothing here survives a reload.
 *
 * Caches register a reset here so signing in or out never shows another editor's data.
 */
const resets = new Set<() => void>();

export function onAdminCacheClear(reset: () => void): void {
	resets.add(reset);
}

export function clearAdminCache(): void {
	for (const reset of resets) reset();
}
