import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'Components/Toast',
  component: Toast,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '2rem', maxWidth: '400px' }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof Toast>;

export const Success: Story = {
  args: {
    variant: 'success',
    message: 'Your changes have been saved successfully.',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    message: 'Something went wrong. Please try again.',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    message: 'Your session is about to expire in 5 minutes.',
  },
};

export const WithCustomTitle: Story = {
  args: {
    variant: 'success',
    title: 'Upload complete',
    message: 'profile-photo.jpg has been uploaded.',
  },
};

export const WithCloseButton: Story = {
  render: (args) => {
    const [visible, setVisible] = useState(true);
    return visible ? (
      <Toast {...args} onClose={() => setVisible(false)} />
    ) : (
      <p className="text-sm text-zinc-500">Toast dismissed — refresh to reset.</p>
    );
  },
  args: {
    variant: 'warning',
    message: 'Click × to dismiss this notification.',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Toast variant="success" message="Your changes have been saved successfully." />
      <Toast variant="error" message="Something went wrong. Please try again." />
      <Toast variant="warning" message="Your session is about to expire in 5 minutes." />
    </div>
  ),
};
