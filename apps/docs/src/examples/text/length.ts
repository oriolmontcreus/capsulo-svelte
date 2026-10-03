import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';

export default Text('headline')
  .label('Headline')
  .description('Between 10 and 60 characters')
  .minLength(10)
  .maxLength(60)
  .defaultValue('Too short');
