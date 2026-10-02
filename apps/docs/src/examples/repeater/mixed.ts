import { ColorPicker } from '$lib/form-builder/fields/ColorPickerField/color-picker-field.builder';
import { Repeater } from '$lib/form-builder/fields/RepeaterField/repeater-field.builder';
import { Select } from '$lib/form-builder/fields/SelectField/select-field.builder';
import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';
import { Toggle } from '$lib/form-builder/fields/ToggleField/toggle-field.builder';

export default Repeater('buttons', [
  Text('label').label('Label'),
  Select('variant')
    .label('Variant')
    .options([
      { label: 'Primary', value: 'primary' },
      { label: 'Secondary', value: 'secondary' },
    ])
    .defaultValue('primary'),
  Toggle('external').label('Opens in a new tab'),
  ColorPicker('accent').label('Accent color'),
])
  .label('Buttons')
  .itemName('Button')
  .maxItems(3)
  .defaultValue([{ label: 'Get started' }]);
