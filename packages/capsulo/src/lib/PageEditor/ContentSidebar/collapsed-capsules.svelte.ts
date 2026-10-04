import { isStringArray, readUiState, writeUiState } from "../../admin/ui-state";

/** Which capsules are folded on a page; remembered per page for the tab's session. */
export function createCollapsedCapsulesState(getPageId: () => string) {
	const storageKey = () => `collapsed:${getPageId()}`;
	let collapsedCapsuleKeys = $state(new Set<string>(readUiState(storageKey(), isStringArray) ?? []));

	$effect(() => {
		writeUiState(storageKey(), [...collapsedCapsuleKeys]);
	});

	function isExpanded(capsuleKey: string): boolean {
		return !collapsedCapsuleKeys.has(capsuleKey);
	}

	function toggle(capsuleKey: string): void {
		const next = new Set(collapsedCapsuleKeys);
		if (next.has(capsuleKey)) {
			next.delete(capsuleKey);
		} else {
			next.add(capsuleKey);
		}
		collapsedCapsuleKeys = next;
	}

	function expand(capsuleKey: string): void {
		if (!collapsedCapsuleKeys.has(capsuleKey)) return;
		const next = new Set(collapsedCapsuleKeys);
		next.delete(capsuleKey);
		collapsedCapsuleKeys = next;
	}

	function collapseAll(capsuleKeys: string[]): void {
		collapsedCapsuleKeys = new Set(capsuleKeys);
	}

	return {
		isExpanded,
		toggle,
		expand,
		collapseAll,
	};
}
