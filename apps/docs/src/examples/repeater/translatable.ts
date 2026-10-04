import { FileUpload, Repeater, Text } from 'capsulo/schema';

export default Repeater('cards', [
  Text('title').label('Title').translatable(),
  FileUpload('image').label('Image').images(),
])
  .label('Cards')
  .itemName('Card')
  .defaultValue([{ title: 'Fast by default' }]);
