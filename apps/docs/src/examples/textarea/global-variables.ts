import { Textarea } from '$lib/form-builder/fields/TextareaField/textarea-field.builder';

export default Textarea('footer')
  .label('Footer text')
  .translatable()
  .defaultValue('© {{siteName}}. Write to us at {{siteEmail}}.');
