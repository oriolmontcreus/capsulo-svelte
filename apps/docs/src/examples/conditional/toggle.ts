import { Text } from '$lib/form-builder/fields/TextField/text-field.builder';
import { Toggle } from '$lib/form-builder/fields/ToggleField/toggle-field.builder';

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
