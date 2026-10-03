import { Select } from '$lib/form-builder/fields/SelectField/select-field.builder';
import { Textarea } from '$lib/form-builder/fields/TextareaField/textarea-field.builder';

export default [
  Select('audience')
    .label('Audience')
    .options([
      { label: 'Everyone', value: 'everyone' },
      { label: 'Members only', value: 'members' },
    ])
    .defaultValue('members'),
  Textarea('membersNote')
    .label('Note for members')
    .description('Required when the audience is "Members only"')
    .required((values) => values.audience === 'members'),
];
