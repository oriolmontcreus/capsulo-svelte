import { Text, Toggle } from 'capsulo/schema';

export default [
  Toggle('showCta').label('Show call to action'),
  Text('ctaLabel')
    .label('Button label')
    .hidden((values) => values.showCta !== true)
    .required((values) => values.showCta === true),
  Text('ctaUrl')
    .label('Button link')
    .type('url')
    .hidden((values) => values.showCta !== true)
    .required((values) => values.showCta === true),
];
