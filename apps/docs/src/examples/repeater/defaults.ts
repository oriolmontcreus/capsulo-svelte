import { Repeater } from '$lib/form-builder/fields/RepeaterField/repeater-field.builder';
import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';

export default Repeater('links', [
  Text('label').label('Label'),
  Text('href').label('Link'),
])
  .label('Footer links')
  .itemName('Link')
  .defaultValue([
    { label: 'Docs', href: '/docs' },
    { label: 'Blog', href: '/blog' },
  ]);
