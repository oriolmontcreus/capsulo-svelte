import { ColorPicker } from '$lib/form-builder/fields/ColorPickerField/color-picker-field.builder';

export default ColorPicker('brandColor')
  .label('Brand color')
  .presetColors(['#ef4444', '#f59e0b', '#eab308', '#10b981', '#3b82f6']);
