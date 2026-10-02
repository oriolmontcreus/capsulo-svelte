import { Repeater } from '$lib/form-builder/fields/RepeaterField/repeater-field.builder';
import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';

export default Repeater('stats', [
  Text('value').label('Value').placeholder('10k'),
  Text('label').label('Label').placeholder('Users'),
])
  .label('Stats')
  .description('Between 2 and 4 stats.')
  .itemName('Stat')
  .minItems(2)
  .maxItems(4);
