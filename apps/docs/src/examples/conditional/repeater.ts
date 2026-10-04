import { Repeater, Text, Toggle } from 'capsulo/schema';

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
