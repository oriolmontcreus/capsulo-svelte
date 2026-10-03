import { RichEditor } from '$lib/form-builder/fields/RichEditorField/rich-editor-field.builder';

export default RichEditor('teaser')
  .label('Teaser')
  .description('Up to 40 visible characters')
  .maxLength(40)
  .defaultValue('<p>This teaser is <strong>far too long</strong> to fit in the card.</p>');
