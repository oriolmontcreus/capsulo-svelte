import { Select } from '$lib/form-builder/fields/SelectField/select-field.builder';

export default Select('linkedPage')
  .label('Link to page')
  .placeholder('Select a page to link to')
  .internalLinks();
