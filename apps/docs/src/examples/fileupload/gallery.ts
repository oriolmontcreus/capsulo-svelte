import { FileUpload } from '$lib/form-builder/fields/FileUploadField/file-upload-field.builder';

export default FileUpload('gallery').label('Image gallery').images().multiple().maxFiles(6);
