import { Textarea } from 'capsulo/schema';

export default Textarea('summary')
  .label('Summary')
  .description('At least 40 characters')
  .minLength(40)
  .required()
  .defaultValue('Too short to publish.');
