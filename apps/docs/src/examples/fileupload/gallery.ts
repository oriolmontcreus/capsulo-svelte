import { FileUpload } from 'capsulo/schema';

export default FileUpload('gallery').label('Image gallery').images().multiple().maxFiles(6);
