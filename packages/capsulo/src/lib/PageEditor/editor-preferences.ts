/**
 * Editor preferences kept for the tab's session (see admin/ui-state.ts). The editing language
 * is shared by the Page Editor and the Global Variables, so switching between them keeps it.
 */
import { isNumber, readUiState, writeUiState } from "../admin/ui-state";
import { DEFAULT_LOCALE, LOCALES } from "../config/i18n-config";
import { isPreviewDeviceId, type PreviewDeviceId } from "./preview-devices";

const LOCALE_KEY = "editing-locale";
const LAYOUT_KEY = "editor-layout";

export type EditorLayout = {
	previewDevice: PreviewDeviceId;
	sidebarWidth: number;
};

const isEditingLocale = (value: unknown): value is string =>
	typeof value === "string" && LOCALES.includes(value);

const isEditorLayout = (value: unknown): value is EditorLayout =>
	typeof value === "object" &&
	value !== null &&
	isPreviewDeviceId((value as EditorLayout).previewDevice) &&
	isNumber((value as EditorLayout).sidebarWidth);

export function readEditingLocale(): string {
	return readUiState(LOCALE_KEY, isEditingLocale) ?? DEFAULT_LOCALE;
}

export function saveEditingLocale(locale: string): void {
	writeUiState(LOCALE_KEY, locale);
}

export function readEditorLayout(): EditorLayout | undefined {
	return readUiState(LAYOUT_KEY, isEditorLayout);
}

export function saveEditorLayout(layout: EditorLayout): void {
	writeUiState(LAYOUT_KEY, layout);
}
