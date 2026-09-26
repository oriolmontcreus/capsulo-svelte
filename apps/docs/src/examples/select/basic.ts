import { Select } from '$lib/form-builder/fields/SelectField/select-field.builder';

export default Select('country')
  .label('Country')
  .placeholder('Select a country')
  .options([
    { label: 'United States', value: 'us' },
    { label: 'United Kingdom', value: 'uk' },
    { label: 'Canada', value: 'ca' },
    { label: 'Australia', value: 'au' },
  ]);
