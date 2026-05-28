import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { Dropdown, type DropdownOption } from './Dropdown';

const fruits: DropdownOption[] = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
  { label: 'Durian', value: 'durian' },
  { label: 'Elderberry', value: 'elderberry' },
];

const meta: Meta<typeof Dropdown> = {
  title: 'Components/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
  },
  args: {
    options: fruits,
    placeholder: 'Select a fruit',
  },
};
export default meta;

type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {};

export const WithLabel: Story = {
  args: { label: 'Favorite fruit' },
};

export const WithDefaultValue: Story = {
  args: { defaultValue: 'cherry' },
};

export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };

export const FullWidth: Story = {
  args: { fullWidth: true, label: 'Favorite fruit' },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: 'apple' },
};

export const WithDisabledOptions: Story = {
  args: {
    options: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana (out of stock)', value: 'banana', disabled: true },
      { label: 'Cherry', value: 'cherry' },
      { label: 'Durian (out of stock)', value: 'durian', disabled: true },
    ],
  },
};

export const Controlled: Story = {
  render: (args) => {
    const [value, setValue] = useState<string>('banana');
    return (
      <div className="space-y-3">
        <Dropdown {...args} value={value} onChange={setValue} />
        <p className="text-sm text-gray-600">Selected: {value}</p>
      </div>
    );
  },
};

export const Empty: Story = {
  args: { options: [] },
};
