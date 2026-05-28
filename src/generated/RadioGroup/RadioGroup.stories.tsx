import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { RadioGroup } from './RadioGroup';

const meta: Meta<typeof RadioGroup> = {
  title: 'Components/RadioGroup',
  component: RadioGroup,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'radio', options: ['vertical', 'horizontal'] },
    size: { control: 'radio', options: ['sm', 'md', 'lg'] },
  },
};
export default meta;

type Story = StoryObj<typeof RadioGroup>;

const planOptions = [
  { value: 'starter', label: 'Starter' },
  { value: 'pro', label: 'Pro' },
  { value: 'enterprise', label: 'Enterprise' },
];

const planOptionsWithDescriptions = [
  { value: 'starter', label: 'Starter', description: 'For individuals just getting started.' },
  { value: 'pro', label: 'Pro', description: 'For growing teams that need more power.' },
  { value: 'enterprise', label: 'Enterprise', description: 'Advanced features and dedicated support.' },
];

export const Default: Story = {
  args: {
    label: 'Choose a plan',
    options: planOptions,
    defaultValue: 'pro',
  },
};

export const WithDescriptions: Story = {
  args: {
    label: 'Choose a plan',
    options: planOptionsWithDescriptions,
    defaultValue: 'pro',
  },
};

export const Horizontal: Story = {
  args: {
    label: 'Size',
    orientation: 'horizontal',
    options: [
      { value: 'sm', label: 'Small' },
      { value: 'md', label: 'Medium' },
      { value: 'lg', label: 'Large' },
    ],
    defaultValue: 'md',
  },
};

export const Small: Story = {
  args: { label: 'Small radio group', size: 'sm', options: planOptions, defaultValue: 'starter' },
};

export const Large: Story = {
  args: { label: 'Large radio group', size: 'lg', options: planOptions, defaultValue: 'starter' },
};

export const WithHelperText: Story = {
  args: {
    label: 'Notification preference',
    helperText: 'You can change this later in account settings.',
    options: [
      { value: 'email', label: 'Email' },
      { value: 'sms', label: 'SMS' },
      { value: 'none', label: 'None' },
    ],
    defaultValue: 'email',
  },
};

export const WithError: Story = {
  args: {
    label: 'Choose a plan',
    options: planOptions,
    error: 'Please select a plan to continue.',
    required: true,
  },
};

export const WithDisabledOption: Story = {
  args: {
    label: 'Choose a plan',
    options: [
      { value: 'starter', label: 'Starter' },
      { value: 'pro', label: 'Pro' },
      { value: 'enterprise', label: 'Enterprise (contact sales)', disabled: true },
    ],
    defaultValue: 'starter',
  },
};

export const FullyDisabled: Story = {
  args: {
    label: 'Choose a plan',
    options: planOptions,
    defaultValue: 'pro',
    disabled: true,
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState('pro');
    return (
      <div className="flex flex-col gap-4">
        <RadioGroup {...args} value={value} onChange={setValue} />
        <p className="text-sm text-gray-600">Selected: <span className="font-mono">{value}</span></p>
      </div>
    );
  },
  args: {
    label: 'Choose a plan',
    options: planOptionsWithDescriptions,
  },
};
