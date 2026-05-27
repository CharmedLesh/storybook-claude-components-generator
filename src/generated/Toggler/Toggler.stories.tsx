import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Toggler } from './Toggler';

const meta: Meta<typeof Toggler> = {
  title: 'Components/Toggler',
  component: Toggler,
  tags: ['autodocs'],
  render: function Render(args) {
    const [checked, setChecked] = useState(args.checked ?? false);
    return <Toggler {...args} checked={checked} onChange={setChecked} />;
  },
};
export default meta;

type Story = StoryObj<typeof Toggler>;

export const NoLabel: Story = {
  args: {},
};

export const LabelTop: Story = {
  args: { label: 'Dark mode', labelPosition: 'top' },
};

export const LabelLeft: Story = {
  args: { label: 'Notifications', labelPosition: 'left' },
};

export const LabelRight: Story = {
  args: { label: 'Auto-save', labelPosition: 'right' },
};

export const Disabled: Story = {
  args: { label: 'Locked setting', labelPosition: 'right', disabled: true },
};

export const DisabledChecked: Story = {
  args: { label: 'Locked on', labelPosition: 'right', disabled: true, checked: true },
};

export const Small: Story = {
  args: { label: 'Small toggle', labelPosition: 'right', size: 'sm' },
};

export const Large: Story = {
  args: { label: 'Large toggle', labelPosition: 'right', size: 'lg' },
};
