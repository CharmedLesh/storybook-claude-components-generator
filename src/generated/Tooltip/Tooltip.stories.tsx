import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Tooltip } from './Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '4rem', display: 'flex', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Tooltip>;

export const Top: Story = {
  args: { text: 'Tooltip on top', position: 'top' },
};

export const Bottom: Story = {
  args: { text: 'Tooltip on bottom', position: 'bottom' },
};

export const Left: Story = {
  args: { text: 'Tooltip on left', position: 'left' },
};

export const Right: Story = {
  args: { text: 'Tooltip on right', position: 'right' },
};

export const Small: Story = {
  args: { text: 'Small trigger', position: 'top', size: 'sm' },
};

export const Large: Story = {
  args: { text: 'Large trigger', position: 'top', size: 'lg' },
};

export const CustomTrigger: Story = {
  args: { text: 'Save your changes', position: 'top' },
  render: (args) => (
    <Tooltip {...args}>
      <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
        Save
      </button>
    </Tooltip>
  ),
};

export const AllPositions: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-12">
      <div className="flex justify-center">
        <Tooltip text="Top" position="top" />
      </div>
      <div className="flex justify-center">
        <Tooltip text="Bottom" position="bottom" />
      </div>
      <div className="flex justify-center">
        <Tooltip text="Left" position="left" />
      </div>
      <div className="flex justify-center">
        <Tooltip text="Right" position="right" />
      </div>
    </div>
  ),
};
