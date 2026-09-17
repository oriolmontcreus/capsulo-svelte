import diff from "microdiff";
import type {
	PageEditorValuesByInstance
} from "$lib/PageEditor/persistence";
import type { LocalizedFieldValue, SchemaValues } from "$lib/form-builder/core/types";

export type FieldChangeKind = "added" | "removed" | "changed";

export type FieldChange = {
	instanceId: string;
	fieldName: string;
	locale: string;
	oldValue: unknown;
	newValue: unknown;
	kind: FieldChangeKind;
};

export type InstanceChange = {
	instanceId: string;
	/** True when the instance had no committed (baseline) values but has draft values. */
	isNew: boolean;
	fields: FieldChange[];
};

export type PageChangeSet = {
	pageId: string;
	instances: InstanceChange[];
};

/**
 * Normalizes "empty-ish" values so that null, undefined, "", [] and {} all
 * compare as equal (treated as "no value"). Mirrors the legacy CMS behaviour so
 * that clearing a field back to empty is not reported as a spurious change.
 */
export function normalizeForComparison(value: unknown): unknown {
	if (value === null || value === undefined || value === "") return undefined;
	if (Array.isArray(value)) return value.length === 0 ? undefined : value;
	if (typeof value === "object") {
		return Object.keys(value as Record<string, unknown>).length === 0 ? undefined : value;
	}
	return value;
}

/**
 * Structural deep-equality using microdiff. Order-insensitive for objects and
 * robust for nested arrays (select multiple, file-upload lists).
 */
function valuesEqual(a: unknown, b: unknown): boolean {
	const left = normalizeForComparison(a);
	const right = normalizeForComparison(b);
	if (left === undefined && right === undefined) return true;
	return diff({ value: left }, { value: right }).length === 0;
}

function localeKeys(
	oldField: LocalizedFieldValue<unknown> | undefined,
	newField: LocalizedFieldValue<unknown> | undefined
): string[] {
	const keys = new Set<string>();
	if (oldField) for (const key of Object.keys(oldField)) keys.add(key);
	if (newField) for (const key of Object.keys(newField)) keys.add(key);
	return [...keys];
}

function classifyKind(oldValue: unknown, newValue: unknown): FieldChangeKind {
	const oldEmpty = normalizeForComparison(oldValue) === undefined;
	const newEmpty = normalizeForComparison(newValue) === undefined;
	if (oldEmpty && !newEmpty) return "added";
	if (!oldEmpty && newEmpty) return "removed";
	return "changed";
}

function instanceHasValues(instance: SchemaValues | undefined): boolean {
	if (!instance) return false;
	for (const field of Object.values(instance)) {
		if (!field) continue;
		for (const localeValue of Object.values(field)) {
			if (normalizeForComparison(localeValue) !== undefined) return true;
		}
	}
	return false;
}

function computeInstanceChange(
	instanceId: string,
	oldInstance: SchemaValues | undefined,
	newInstance: SchemaValues | undefined
): InstanceChange | null {
	const fieldNames = new Set<string>();
	if (oldInstance) for (const name of Object.keys(oldInstance)) fieldNames.add(name);
	if (newInstance) for (const name of Object.keys(newInstance)) fieldNames.add(name);

	const fields: FieldChange[] = [];

	for (const fieldName of fieldNames) {
		const oldField = oldInstance?.[fieldName];
		const newField = newInstance?.[fieldName];

		for (const locale of localeKeys(oldField, newField)) {
			const oldValue = oldField?.[locale];
			const newValue = newField?.[locale];
			if (valuesEqual(oldValue, newValue)) continue;

			fields.push({
				instanceId,
				fieldName,
				locale,
				oldValue,
				newValue,
				kind: classifyKind(oldValue, newValue)
			});
		}
	}

	if (fields.length === 0) return null;

	return {
		instanceId,
		isNew: !instanceHasValues(oldInstance) && instanceHasValues(newInstance),
		fields
	};
}

/**
 * Computes the difference between a page's committed baseline values and its
 * current local draft values, broken down per instance / field / locale.
 * Only real changes are included (empty-ish equivalences are ignored).
 */
export function computePageChangeSet(
	pageId: string,
	baselineValues: PageEditorValuesByInstance,
	draftValues: PageEditorValuesByInstance
): PageChangeSet {
	const instanceIds = new Set<string>();
	for (const id of Object.keys(baselineValues)) instanceIds.add(id);
	for (const id of Object.keys(draftValues)) instanceIds.add(id);

	const instances: InstanceChange[] = [];
	for (const instanceId of instanceIds) {
		const change = computeInstanceChange(
			instanceId,
			baselineValues[instanceId],
			draftValues[instanceId]
		);
		if (change) instances.push(change);
	}

	return { pageId, instances };
}

export function pageHasChanges(changeSet: PageChangeSet): boolean {
	return changeSet.instances.length > 0;
}

export function countFieldChanges(changeSet: PageChangeSet): number {
	let total = 0;
	for (const instance of changeSet.instances) total += instance.fields.length;
	return total;
}
