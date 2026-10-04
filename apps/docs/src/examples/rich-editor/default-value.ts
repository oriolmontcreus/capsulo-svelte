import { RichEditor } from 'capsulo/schema';

export default RichEditor('about')
  .label('About us')
  .description('Bold, italic and underline, plus global variables')
  .translatable()
  .defaultValue('<p><strong>{{siteName}}</strong> builds <em>fast</em> websites.</p>');
