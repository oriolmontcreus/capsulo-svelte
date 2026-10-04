import { Text } from 'capsulo/schema';

export default [
  Text('price')
    .label('Price')
    .type('number')
    .min(0)
    .step(0.01)
    .prefix('€')
    .defaultValue(19.99),
  Text('seats')
    .label('Seats')
    .type('number')
    .min(1)
    .allowDecimals(false)
    .suffix('people'),
];
