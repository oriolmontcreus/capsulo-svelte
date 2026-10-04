import { Select } from 'capsulo/schema';

export default Select('tags')
  .label('Tags')
  .placeholder('Select tags')
  .multiple()
  .defaultValue(['news'])
  .options([
    { label: 'News', value: 'news' },
    { label: 'Tutorial', value: 'tutorial' },
    { label: 'Release', value: 'release' },
    { label: 'Case study', value: 'case-study' },
  ]);
