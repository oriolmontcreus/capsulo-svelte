import { FileUpload } from '$lib/form-builder/fields/FileUploadField/file-upload-field.builder';

export default FileUpload('heroImage')
  .label('Hero image')
  .images()
  .maxSize(5 * 1024 * 1024); // 5 MB
