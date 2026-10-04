import { Repeater, Text, Textarea } from 'capsulo/schema';

export default Repeater('features', [
  Text('title').label('Title'),
  Textarea('description').label('Description').rows(2),
])
  .label('Features')
  .itemName('Feature');
