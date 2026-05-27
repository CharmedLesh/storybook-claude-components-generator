import path from 'node:path';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  isValidModel,
  buildAgentEnv,
  canUseToolSandboxed,
  GENERATED_DIR,
} from '../agent';

// ---------- isValidModel ----------

describe('isValidModel', () => {
  it('accepts known model ids', () => {
    expect(isValidModel('claude-opus-4-7')).toBe(true);
    expect(isValidModel('claude-sonnet-4-6')).toBe(true);
    expect(isValidModel('claude-haiku-4-5')).toBe(true);
  });

  it('rejects unknown model ids', () => {
    expect(isValidModel('gpt-4')).toBe(false);
    expect(isValidModel('')).toBe(false);
    expect(isValidModel('claude-opus')).toBe(false);
  });
});

// ---------- buildAgentEnv ----------

describe('buildAgentEnv', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('strips ANTHROPIC_API_KEY', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-test-key';
    const env = buildAgentEnv();
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('strips ANTHROPIC_AUTH_TOKEN', () => {
    process.env.ANTHROPIC_AUTH_TOKEN = 'some-token';
    const env = buildAgentEnv();
    expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
  });

  it('preserves other env vars', () => {
    process.env.MY_VAR = 'hello';
    const env = buildAgentEnv();
    expect(env.MY_VAR).toBe('hello');
  });

  it('sets CLAUDE_AGENT_SDK_CLIENT_APP', () => {
    const env = buildAgentEnv();
    expect(env.CLAUDE_AGENT_SDK_CLIENT_APP).toBe(
      'storybook-claude-components-generator/0.1.0',
    );
  });
});

// ---------- canUseToolSandboxed ----------

describe('canUseToolSandboxed', () => {
  describe('tool allowlist', () => {
    it.each([
      { tool: 'Read', input: { file_path: 'test.tsx' } },
      { tool: 'Write', input: { file_path: 'test.tsx' } },
      { tool: 'Edit', input: { file_path: 'test.tsx' } },
      { tool: 'MultiEdit', input: { file_path: 'test.tsx' } },
      { tool: 'Glob', input: {} },
      { tool: 'Grep', input: {} },
      { tool: 'TodoWrite', input: {} },
    ])('allows $tool', async ({ tool, input }) => {
      const result = await canUseToolSandboxed(tool, input);
      expect(result.behavior).toBe('allow');
    });

    it.each(['Bash', 'WebFetch', 'WebSearch', 'Task', 'Agent', 'SomethingRandom'])(
      'denies %s',
      async (tool) => {
        const result = await canUseToolSandboxed(tool, {});
        expect(result.behavior).toBe('deny');
      },
    );
  });

  describe('file path sandboxing (Read/Write/Edit/MultiEdit)', () => {
    it('allows relative paths inside generated dir', async () => {
      const result = await canUseToolSandboxed('Write', {
        file_path: 'Button/Button.tsx',
      });
      expect(result.behavior).toBe('allow');
    });

    it('allows absolute paths inside generated dir', async () => {
      const abs = path.join(GENERATED_DIR, 'Card', 'Card.tsx');
      const result = await canUseToolSandboxed('Write', { file_path: abs });
      expect(result.behavior).toBe('allow');
    });

    it('denies paths that escape generated dir with ..', async () => {
      const result = await canUseToolSandboxed('Write', {
        file_path: '../app/page.tsx',
      });
      expect(result.behavior).toBe('deny');
    });

    it('denies absolute paths outside generated dir', async () => {
      const result = await canUseToolSandboxed('Read', {
        file_path: '/etc/passwd',
      });
      expect(result.behavior).toBe('deny');
    });

    it('denies file tools when no path field is provided', async () => {
      for (const tool of ['Read', 'Write', 'Edit', 'MultiEdit']) {
        const result = await canUseToolSandboxed(tool, {});
        expect(result.behavior).toBe('deny');
      }
    });

    it('recognises path and target_file fields too', async () => {
      const outside = await canUseToolSandboxed('Edit', {
        target_file: '/tmp/evil.txt',
      });
      expect(outside.behavior).toBe('deny');

      const inside = await canUseToolSandboxed('Edit', {
        target_file: path.join(GENERATED_DIR, 'ok.tsx'),
      });
      expect(inside.behavior).toBe('allow');
    });
  });

  describe('Glob/Grep path scoping', () => {
    it('allows search rooted inside generated dir', async () => {
      const result = await canUseToolSandboxed('Glob', {
        path: GENERATED_DIR,
        pattern: '**/*.tsx',
      });
      expect(result.behavior).toBe('allow');
    });

    it('defaults to generated dir when no path is given', async () => {
      const result = await canUseToolSandboxed('Grep', { pattern: 'TODO' });
      expect(result.behavior).toBe('allow');
    });

    it('denies search rooted outside generated dir', async () => {
      const result = await canUseToolSandboxed('Glob', {
        path: '/tmp',
        pattern: '**/*',
      });
      expect(result.behavior).toBe('deny');
    });
  });

  describe('allow result shape', () => {
    it('always returns updatedInput on allow', async () => {
      const input = { file_path: 'test.tsx' };
      const result = await canUseToolSandboxed('Write', input);
      expect(result.behavior).toBe('allow');
      expect((result as { updatedInput: unknown }).updatedInput).toBe(input);
    });
  });

  describe('deny result shape', () => {
    it('returns a message on deny', async () => {
      const result = await canUseToolSandboxed('Bash', {});
      expect(result.behavior).toBe('deny');
      expect((result as { message: string }).message).toBeTruthy();
    });
  });
});
