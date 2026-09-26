import { Select } from '$lib/form-builder/fields/SelectField/select-field.builder';

export default Select('color')
  .label('Color')
  .placeholder('Pick a color')
  .searchable()
  .columns(3)
  .options([
    { label: 'Red', value: 'red' },
    { label: 'Orange', value: 'orange' },
    { label: 'Yellow', value: 'yellow' },
    { label: 'Green', value: 'green' },
    { label: 'Teal', value: 'teal' },
    { label: 'Blue', value: 'blue' },
    { label: 'Indigo', value: 'indigo' },
    { label: 'Purple', value: 'purple' },
    { label: 'Pink', value: 'pink' },
  ]);
