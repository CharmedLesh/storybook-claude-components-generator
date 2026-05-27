import type { Meta, StoryObj } from '@storybook/nextjs-vite';

function Welcome() {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 640 }}>
      <h1 style={{ fontSize: 28, margin: 0 }}>Generated components live here</h1>
      <p style={{ color: '#555', marginTop: 12 }}>
        Ask Claude in the chat pane to build a new component. Files will be written into{' '}
        <code>src/generated/</code> and appear in this Storybook sidebar automatically.
      </p>
      <p style={{ color: '#555' }}>
        Try: <em>&ldquo;Create a primary Button with size variants and a loading state.&rdquo;</em>
      </p>
    </div>
  );
}

const meta: Meta<typeof Welcome> = {
  title: 'Welcome',
  component: Welcome,
};
export default meta;

export const Default: StoryObj<typeof Welcome> = {};
