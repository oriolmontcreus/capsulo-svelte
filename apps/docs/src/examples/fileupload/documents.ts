import { FileUpload } from '$lib/form-builder/fields/FileUploadField/file-upload-field.builder';

export default FileUpload('resume')
  .label('Resume')
  .description('PDF or Word document')
  .accept('.pdf,.doc,.docx')
  .maxSize(10 * 1024 * 1024); // 10 MB
