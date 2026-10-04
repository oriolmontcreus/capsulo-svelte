import { Select } from 'capsulo/schema';

export default Select('framework')
  .label('Framework')
  .placeholder('Choose a framework')
  .groups([
    {
      label: 'Frontend',
      options: [
        { label: 'Svelte', value: 'svelte' },
        { label: 'React', value: 'react' },
        { label: 'Vue', value: 'vue' },
      ],
    },
    {
      label: 'Backend',
      options: [
        { label: 'Hono', value: 'hono' },
        { label: 'Express', value: 'express' },
        { label: 'Fastify', value: 'fastify' },
      ],
    },
  ]);
