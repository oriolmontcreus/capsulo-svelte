import { Select } from 'capsulo/schema';

export default Select('linkedPage')
  .label('Link to page')
  .placeholder('Select a page to link to')
  .searchable()
  .internalLinks(true, true);
