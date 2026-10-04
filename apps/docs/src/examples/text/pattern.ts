import { Text } from 'capsulo/schema';

export default Text('slug')
  .label('Slug')
  .description('Lowercase letters, numbers and dashes')
  .prefix('/')
  .regex('[a-z0-9]+(?:-[a-z0-9]+)*')
  .defaultValue('Not A Slug');
