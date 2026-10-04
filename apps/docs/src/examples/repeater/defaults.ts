import { Repeater, Text } from 'capsulo/schema';

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
