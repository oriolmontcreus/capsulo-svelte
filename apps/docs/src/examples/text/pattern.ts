import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';

export default Text('slug')
  .label('Slug')
  .description('Lowercase letters, numbers and dashes')
  .prefix('/')
  .regex('[a-z0-9]+(?:-[a-z0-9]+)*')
  .defaultValue('Not A Slug');
