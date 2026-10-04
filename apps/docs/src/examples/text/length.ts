import { Text } from 'capsulo/schema';

export default Text('headline')
  .label('Headline')
  .description('Between 10 and 60 characters')
  .minLength(10)
  .maxLength(60)
  .defaultValue('Too short');
