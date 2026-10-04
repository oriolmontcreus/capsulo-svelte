import { Text } from 'capsulo/schema';

export default Text('email')
  .label('Email address')
  .description('We reply to this address')
  .placeholder('john@example.com')
  .required();
