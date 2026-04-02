import type { Meta, StoryObj } from '@storybook/react';

const meta: Meta = {
  title: 'Components/{{LIB_NAME}}',
  // component: ComponentName,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  args: {},
  render: () => <div>{{LIB_NAME}} default story container</div>
};
