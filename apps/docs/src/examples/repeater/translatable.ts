import { FileUpload } from '$lib/form-builder/fields/FileUploadField/file-upload-field.builder';
import { Repeater } from '$lib/form-builder/fields/RepeaterField/repeater-field.builder';
import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';

export default Repeater('cards', [
  Text('title').label('Title').translatable(),
  FileUpload('image').label('Image').images(),
])
  .label('Cards')
  .itemName('Card')
  .defaultValue([{ title: 'Fast by default' }]);
