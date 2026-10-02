import { Repeater } from '$lib/form-builder/fields/RepeaterField/repeater-field.builder';
import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';
import { Textarea } from '$lib/form-builder/fields/TextareaField/textarea-field.builder';

export default Repeater('features', [
  Text('title').label('Title'),
  Textarea('description').label('Description').rows(2),
])
  .label('Features')
  .itemName('Feature');
