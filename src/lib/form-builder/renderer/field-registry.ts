import type { Component } from "svelte";
import type { FieldType } from "../core/types";
import TextFieldComponent from "../fields/TextField/text-field.field.svelte";
import TextareaFieldComponent from "../fields/TextareaField/textarea-field.field.svelte";
import RichEditorFieldComponent from "../fields/RichEditorField/rich-editor-field.field.svelte";
import ToggleFieldComponent from "../fields/ToggleField/toggle-field.field.svelte";
import SelectFieldComponent from "../fields/SelectField/select-field.field.svelte";
import ColorPickerFieldComponent from "../fields/ColorPickerField/color-picker-field.field.svelte";
import FileUploadFieldComponent from "../fields/FileUploadField/file-upload-field.field.svelte";
import RepeaterFieldComponent from "../fields/RepeaterField/repeater-field.field.svelte";

// Built on first use: the repeater component renders SchemaFieldList, which imports this
// module, so the imports above may not be initialised yet while this module evaluates.
let fieldRegistry: Record<FieldType, Component<any>> | undefined;

export function getFieldComponent(type: FieldType): Component<any> | undefined {
  fieldRegistry ??= {
    text: TextFieldComponent,
    textarea: TextareaFieldComponent,
    "rich-editor": RichEditorFieldComponent,
    toggle: ToggleFieldComponent,
    select: SelectFieldComponent,
    colorpicker: ColorPickerFieldComponent,
    "file-upload": FileUploadFieldComponent,
    repeater: RepeaterFieldComponent,
  };
  return fieldRegistry[type];
}
