import { Textarea } from '$lib/form-builder/fields/TextareaField/textarea-field.builder';

export default Textarea('bio').label('Short bio').description('Up to 160 characters').maxLength(160);
