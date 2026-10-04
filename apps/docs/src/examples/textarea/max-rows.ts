import { Textarea } from 'capsulo/schema';

export default Textarea('notes')
  .label('Notes')
  .description('Grows from 2 to 5 rows, then scrolls')
  .minRows(2)
  .maxRows(5);
