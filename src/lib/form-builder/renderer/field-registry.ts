import type { Component } from "svelte";
import type { FieldType } from "../core/types";
import TextFieldComponent from "../fields/TextField/text-field.field.svelte";

export const fieldRegistry: Record<FieldType, Component<any>> = {
	text: TextFieldComponent
};

export function getFieldComponent(type: FieldType): Component<any> | undefined {
	return fieldRegistry[type];
}
