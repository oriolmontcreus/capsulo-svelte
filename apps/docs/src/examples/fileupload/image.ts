import { FileUpload } from 'capsulo/schema';

export default FileUpload('heroImage')
  .label('Hero image')
  .images()
  .maxSize(5 * 1024 * 1024); // 5 MB
