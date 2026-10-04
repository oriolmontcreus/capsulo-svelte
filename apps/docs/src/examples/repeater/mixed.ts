import { ColorPicker, Repeater, Select, Text, Toggle } from 'capsulo/schema';

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
