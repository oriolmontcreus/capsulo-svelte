import type { CapsuleManifestEntry } from "../../capsules/core/types";
import type { PageEditorValuesByInstance } from "../persistence";

export type PageEditorSaveControls = {
	save: () => Promise<void>;
	disabled: boolean;
	isSaving: boolean;
};

export type GroupedCapsuleEntry = {
	capsuleKey: string;
	entries: Array<{ entry: CapsuleManifestEntry; entryIndex: number }>;
};

/** A field to open, e.g. from a "fix this" link on the Changes page. */
export type FieldFocusTarget = {
	instanceId: string;
	/** Field names and repeater item ids from the capsule root. */
	path: string[];
};

export type ContentSidebarProps = {
	pageId: string;
	entries: CapsuleManifestEntry[];
	locale: string;
	valuesByInstance: PageEditorValuesByInstance;
	width?: number;
	saveControls: PageEditorSaveControls;
	/** Bring this field into view once the content has loaded. */
	focusTarget?: FieldFocusTarget | null;
	/** Show every validation error, not only those of fields edited in this visit. */
	showAllErrors?: boolean;
};
