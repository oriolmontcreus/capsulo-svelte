import { Textarea } from '$lib/form-builder/fields/TextareaField/textarea-field.builder';

export default Textarea('notes')
  .label('Notes')
  .description('Grows from 2 to 5 rows, then scrolls')
  .minRows(2)
  .maxRows(5);
