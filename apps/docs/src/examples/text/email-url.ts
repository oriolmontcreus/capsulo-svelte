import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';

export default [
  Text('email').label('Contact email').type('email').placeholder('hello@example.com'),
  Text('website').label('Website').type('url').placeholder('https://example.com or /contact'),
];
