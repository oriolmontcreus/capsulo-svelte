import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

export type DraftFieldTarget = {
	instanceId: string;
	fieldName: string;
	locale: string;
};

/**
 * Pure value-setting for the draft, shared by Revert (Changes page) and Recover
 * (History page). Returns a new object rather than mutating, so Svelte state and
 * the cached IndexedDB row never end up sharing references.
 *
 * Kept Supabase/IndexedDB-free (separate from draft-write.ts) so it is testable
 * without a browser, matching the commit-selection.ts split.
 */
export function setDraftFieldValue(
	values: PageEditorValuesByInstance,
	target: DraftFieldTarget,
	value: unknown
): PageEditorValuesByInstance {
	const instance = values[target.instanceId] ?? {};
	const field = instance[target.fieldName] ?? {};

	return {
		...values,
		[target.instanceId]: {
			...instance,
			[target.fieldName]: { ...field, [target.locale]: value }
		}
	};
}
