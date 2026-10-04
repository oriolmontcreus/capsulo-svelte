import { Select, Textarea } from 'capsulo/schema';

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
