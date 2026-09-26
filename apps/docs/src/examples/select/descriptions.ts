import { Select } from '$lib/form-builder/fields/SelectField/select-field.builder';

export default Select('plan')
  .label('Subscription plan')
  .placeholder('Select a plan')
  .searchable()
  .options([
    { label: 'Free', value: 'free', description: 'Basic features for personal use' },
    { label: 'Pro', value: 'pro', description: 'Advanced features for professionals' },
    { label: 'Team', value: 'team', description: 'Collaboration for growing teams' },
    { label: 'Enterprise', value: 'enterprise', description: 'Custom contracts', disabled: true },
  ]);
