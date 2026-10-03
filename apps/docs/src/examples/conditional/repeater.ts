import { Repeater } from '$lib/form-builder/fields/RepeaterField/repeater-field.builder';
import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';
import { Toggle } from '$lib/form-builder/fields/ToggleField/toggle-field.builder';

export default Repeater('speakers', [
  Text('name').label('Name').required(),
  Toggle('hasWebsite').label('Has a website'),
  Text('website')
    .label('Website')
    .type('url')
    .hidden((item) => item.hasWebsite !== true)
    .required((item) => item.hasWebsite === true),
])
  .label('Speakers')
  .itemName('Speaker')
  .defaultValue([{ name: 'Ada Lovelace', hasWebsite: true }]);
