import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';

export default Text('email')
  .label('Email address')
  .description('We reply to this address')
  .placeholder('john@example.com')
  .required();
