import { Textarea } from '$lib/form-builder/fields/TextareaField/textarea-field.builder';

export default Textarea('summary')
  .label('Summary')
  .description('At least 40 characters')
  .minLength(40)
  .required()
  .defaultValue('Too short to publish.');
