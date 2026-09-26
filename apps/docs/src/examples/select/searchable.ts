import { Select } from '$lib/form-builder/fields/SelectField/select-field.builder';

export default Select('city')
  .label('City')
  .placeholder('Select a city')
  .searchable()
  .searchPlaceholder('Search cities...')
  .highlightMatches()
  .options([
    { label: 'New York', value: 'ny' },
    { label: 'Los Angeles', value: 'la' },
    { label: 'Chicago', value: 'chi' },
    { label: 'Houston', value: 'hou' },
    { label: 'Phoenix', value: 'phx' },
    { label: 'Philadelphia', value: 'phl' },
    { label: 'San Antonio', value: 'sat' },
    { label: 'San Diego', value: 'sd' },
  ]);
