import { Text } from 'capsulo/schema';

export default [
  Text('email').label('Contact email').type('email').placeholder('hello@example.com'),
  Text('website').label('Website').type('url').placeholder('https://example.com or /contact'),
];
