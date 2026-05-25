import type { CapsuleManifestEntry } from "$lib/capsules/core/types";
import type { PageEditorValuesByInstance } from "$lib/PageEditor/persistence";

export type PageEditorSaveControls = {
	save: () => Promise<void>;
	disabled: boolean;
	isSaving: boolean;
};

export type GroupedCapsuleEntry = {
	capsuleKey: string;
	entries: Array<{ entry: CapsuleManifestEntry; entryIndex: number }>;
};

export type ContentSidebarProps = {
	pageId: string;
	entries: CapsuleManifestEntry[];
	locale: string;
	valuesByInstance: PageEditorValuesByInstance;
	width?: number;
	saveControls: PageEditorSaveControls;
};
