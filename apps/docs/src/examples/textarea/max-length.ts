import { Textarea } from 'capsulo/schema';

export default Textarea('bio').label('Short bio').description('Up to 160 characters').maxLength(160);
