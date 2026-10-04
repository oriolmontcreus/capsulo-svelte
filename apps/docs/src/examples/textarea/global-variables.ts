import { Textarea } from 'capsulo/schema';

export default Textarea('footer')
  .label('Footer text')
  .translatable()
  .defaultValue('© {{siteName}}. Write to us at {{siteEmail}}.');
