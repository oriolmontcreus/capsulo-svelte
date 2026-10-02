import { Repeater } from '$lib/form-builder/fields/RepeaterField/repeater-field.builder';
import { RichEditor } from '$lib/form-builder/fields/RichEditorField/rich-editor-field.builder';
import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';

export default Repeater('faq', [
  Text('section').label('Section'),
  Repeater('questions', [
    Text('question').label('Question'),
    RichEditor('answer').label('Answer'),
  ])
    .label('Questions')
    .itemName('Question'),
])
  .label('FAQ')
  .itemName('Section')
  .defaultValue([
    {
      section: 'Billing',
      questions: [{ question: 'Can I cancel anytime?', answer: '<p>Yes, from your account settings.</p>' }],
    },
  ]);
