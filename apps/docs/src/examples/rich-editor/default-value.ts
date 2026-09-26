import { RichEditor } from '$lib/form-builder/fields/RichEditorField/rich-editor-field.builder';

export default RichEditor('about')
  .label('About us')
  .description('Bold, italic and underline, plus global variables')
  .translatable()
  .defaultValue('<p><strong>{{siteName}}</strong> builds <em>fast</em> websites.</p>');
