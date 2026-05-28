import type { Component } from "svelte";
import type { FieldType } from "../core/types";
import TextFieldComponent from "../fields/TextField/text-field.field.svelte";
import TextareaFieldComponent from "../fields/TextareaField/textarea-field.field.svelte";
import RichEditorFieldComponent from "../fields/RichEditorField/rich-editor-field.field.svelte";
import ToggleFieldComponent from "../fields/ToggleField/toggle-field.field.svelte";

export const fieldRegistry: Record<FieldType, Component<any>> = {
  text: TextFieldComponent,
  textarea: TextareaFieldComponent,
  "rich-editor": RichEditorFieldComponent,
  toggle: ToggleFieldComponent,
};

export function getFieldComponent(type: FieldType): Component<any> | undefined {
  return fieldRegistry[type];
}
