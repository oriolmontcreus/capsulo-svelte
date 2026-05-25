export function createCollapsedCapsulesState() {
	let collapsedCapsuleKeys = $state(new Set<string>());

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

	return {
		isExpanded,
		toggle,
	};
}
