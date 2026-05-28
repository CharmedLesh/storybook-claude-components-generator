import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Query } from '@anthropic-ai/claude-agent-sdk';
import { summarizeToolResult, truncate } from '../route';

vi.mock('@anthropic-ai/claude-agent-sdk', () => ({
  query: vi.fn(),
}));

function fakeStream(...messages: unknown[]): Query {
  async function* gen() {
    for (const msg of messages) yield msg;
  }
  return gen() as unknown as Query;
}

async function readSSEEvents(res: Response): Promise<Record<string, unknown>[]> {
  const text = await res.text();
  return text
    .split('\n\n')
    .filter((chunk) => chunk.startsWith('data: '))
    .map((chunk) => JSON.parse(chunk.slice(6)));
}

// ---------- truncate ----------

describe('truncate', () => {
  it('returns the string unchanged when within limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('returns the string unchanged at exact limit', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('truncates and appends ellipsis when over limit', () => {
    expect(truncate('hello world', 5)).toBe('hello…');
  });

  it('handles empty string', () => {
    expect(truncate('', 10)).toBe('');
  });

  it('truncates to ellipsis only when limit is zero', () => {
    expect(truncate('hello', 0)).toBe('…');
  });
});

// ---------- summarizeToolResult ----------

describe('summarizeToolResult', () => {
  it('returns a plain string (truncated to 200)', () => {
    expect(summarizeToolResult('short text')).toBe('short text');
  });

  it('truncates long strings', () => {
    const long = 'a'.repeat(300);
    const result = summarizeToolResult(long);
    expect(result.length).toBe(201); // 200 chars + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('joins array of strings', () => {
    expect(summarizeToolResult(['hello', 'world'])).toBe('hello\nworld');
  });

  it('extracts .text from objects in an array', () => {
    const blocks = [{ text: 'line1' }, { text: 'line2' }];
    expect(summarizeToolResult(blocks)).toBe('line1\nline2');
  });

  it('handles mixed arrays (strings and objects)', () => {
    const mixed = ['plain', { text: 'from-obj' }];
    expect(summarizeToolResult(mixed)).toBe('plain\nfrom-obj');
  });

  it('returns empty string for non-string/non-array input', () => {
    expect(summarizeToolResult(42)).toBe('');
    expect(summarizeToolResult(null)).toBe('');
    expect(summarizeToolResult(undefined)).toBe('');
    expect(summarizeToolResult({})).toBe('');
  });

  it('handles array items without text', () => {
    expect(summarizeToolResult([{ foo: 'bar' }, 123])).toBe('\n');
  });

  it('returns empty string for empty array', () => {
    expect(summarizeToolResult([])).toBe('');
  });
});

// ---------- POST handler ----------

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  async function callPost(body: unknown) {
    const { POST } = await import('../route');
    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });
    return POST(req as any);
  }

  // -- Input validation --

  it('returns 400 for invalid JSON', async () => {
    const { POST } = await import('../route');
    const req = new Request('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'not json{{{',
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('invalid_json');
  });

  it('returns 400 for empty prompt', async () => {
    const res = await callPost({ prompt: '' });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('empty_prompt');
  });

  it('returns 400 for whitespace-only prompt', async () => {
    const res = await callPost({ prompt: '   ' });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('empty_prompt');
  });

  it('returns 400 for missing prompt field', async () => {
    const res = await callPost({ model: 'claude-sonnet-4-6' });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('empty_prompt');
  });

  it('returns 400 for non-string prompt', async () => {
    const res = await callPost({ prompt: 42 });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('empty_prompt');
  });

  it('returns 400 for null prompt', async () => {
    const res = await callPost({ prompt: null });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('empty_prompt');
  });

  it('returns 400 when prompt exceeds max length', async () => {
    const res = await callPost({ prompt: 'a'.repeat(50_001) });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('prompt_too_long');
    expect(data.maxLength).toBe(50_000);
  });

  it('accepts a prompt at exactly the max length', async () => {
    const agentModule = await import('@/lib/agent');
    vi.spyOn(agentModule, 'detectClaudeAuth').mockResolvedValue({
      hasOauthCredentials: false,
      credentialsPath: '/fake/.credentials.json',
    });
    const res = await callPost({ prompt: 'a'.repeat(50_000) });
    const data = await res.json();
    expect(data.error).not.toBe('prompt_too_long');
  });

  it('silently ignores a malformed sessionId', async () => {
    const agentModule = await import('@/lib/agent');
    vi.spyOn(agentModule, 'detectClaudeAuth').mockResolvedValue({
      hasOauthCredentials: false,
      credentialsPath: '/fake/.credentials.json',
    });
    const res = await callPost({
      prompt: 'test',
      sessionId: '../../../etc/passwd',
    });
    const data = await res.json();
    expect(data.error).toBe('no_claude_session');
  });

  it('accepts a valid UUID sessionId', async () => {
    const agentModule = await import('@/lib/agent');
    vi.spyOn(agentModule, 'detectClaudeAuth').mockResolvedValue({
      hasOauthCredentials: false,
      credentialsPath: '/fake/.credentials.json',
    });
    const res = await callPost({
      prompt: 'test',
      sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    });
    const data = await res.json();
    expect(data.error).toBe('no_claude_session');
  });

  it('returns 400 when no claude auth is detected', async () => {
    const agentModule = await import('@/lib/agent');
    vi.spyOn(agentModule, 'detectClaudeAuth').mockResolvedValue({
      hasOauthCredentials: false,
      credentialsPath: '/fake/.credentials.json',
    });

    const res = await callPost({ prompt: 'build a button' });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('no_claude_session');
  });

  it('includes login instructions in no_claude_session response', async () => {
    const agentModule = await import('@/lib/agent');
    vi.spyOn(agentModule, 'detectClaudeAuth').mockResolvedValue({
      hasOauthCredentials: false,
      credentialsPath: '/fake/.credentials.json',
    });

    const res = await callPost({ prompt: 'test' });
    const data = await res.json();
    expect(data.message).toContain('claude login');
    expect(data.message).toContain('/fake/.credentials.json');
  });

  // -- SSE streaming --

  describe('SSE streaming', () => {
    async function setupStreamTest() {
      const agentModule = await import('@/lib/agent');
      vi.spyOn(agentModule, 'detectClaudeAuth').mockResolvedValue({
        hasOauthCredentials: true,
        credentialsPath: '/fake/.credentials.json',
      });
      vi.spyOn(agentModule, 'ensureGeneratedDir').mockResolvedValue(undefined);

      const { query } = await import('@anthropic-ai/claude-agent-sdk');
      return { mockQuery: vi.mocked(query), agentModule };
    }

    it('returns SSE response with correct headers', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(fakeStream());

      const res = await callPost({ prompt: 'hello' });
      expect(res.headers.get('content-type')).toBe(
        'text/event-stream; charset=utf-8',
      );
      expect(res.headers.get('cache-control')).toBe('no-store, no-transform');
      expect(res.headers.get('connection')).toBe('keep-alive');
    });

    it('sends start event with default model as first event', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(fakeStream());

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events[0]).toEqual({ type: 'start', model: 'claude-sonnet-4-6' });
    });

    it('falls back to DEFAULT_MODEL for invalid model', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(fakeStream());

      const res = await callPost({ prompt: 'hello', model: 'gpt-4' });
      const events = await readSSEEvents(res);
      expect(events[0]).toEqual({ type: 'start', model: 'claude-sonnet-4-6' });
    });

    it('uses the specified model when valid', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(fakeStream());

      const res = await callPost({
        prompt: 'hello',
        model: 'claude-opus-4-7',
      });
      const events = await readSSEEvents(res);
      expect(events[0]).toEqual({ type: 'start', model: 'claude-opus-4-7' });
    });

    it('sends session event on system init message', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'system',
          subtype: 'init',
          session_id: 'abc-123',
          apiKeySource: 'oauth',
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'session',
        sessionId: 'abc-123',
        apiKeySource: 'oauth',
      });
    });

    it('sends permission_denied on system permission_denied message', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'system',
          subtype: 'permission_denied',
          tool_name: 'Bash',
          message: 'Bash is not allowed',
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'permission_denied',
        toolName: 'Bash',
        message: 'Bash is not allowed',
      });
    });

    it('sends text_delta on content_block_delta stream event', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            delta: { type: 'text_delta', text: 'Hello world' },
          },
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'text_delta',
        text: 'Hello world',
      });
    });

    it('sends tool_use for assistant tool_use blocks', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                id: 'tool-1',
                name: 'Write',
                input: { file_path: 'Button.tsx', content: '...' },
              },
            ],
          },
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'tool_use',
        id: 'tool-1',
        name: 'Write',
        input: { file_path: 'Button.tsx', content: '...' },
      });
    });

    it('handles multiple tool_use blocks in a single assistant message', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', id: 't1', name: 'Write', input: {} },
              { type: 'text', text: 'Thinking...' },
              { type: 'tool_use', id: 't2', name: 'Read', input: {} },
            ],
          },
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      const toolUses = events.filter((e) => e.type === 'tool_use');
      expect(toolUses).toHaveLength(2);
      expect(toolUses[0]).toMatchObject({ id: 't1', name: 'Write' });
      expect(toolUses[1]).toMatchObject({ id: 't2', name: 'Read' });
    });

    it('sends error event when assistant message has error', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'assistant',
          message: { content: [] },
          error: 'context_length_exceeded',
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'error',
        message: 'Model error: context_length_exceeded',
      });
    });

    it('sends tool_result for user tool_result blocks', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-1',
                is_error: false,
                content: 'File written successfully',
              },
            ],
          },
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'tool_result',
        toolUseId: 'tool-1',
        isError: false,
        summary: 'File written successfully',
      });
    });

    it('sends tool_result with isError true when tool reports error', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'user',
          message: {
            content: [
              {
                type: 'tool_result',
                tool_use_id: 'tool-2',
                is_error: true,
                content: 'Permission denied',
              },
            ],
          },
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'tool_result',
        toolUseId: 'tool-2',
        isError: true,
        summary: 'Permission denied',
      });
    });

    it('sends done event on success result', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'result',
          subtype: 'success',
          duration_ms: 1500,
          num_turns: 3,
          total_cost_usd: 0.02,
          session_id: 'sess-456',
          result: 'Component created.',
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'done',
        subtype: 'success',
        durationMs: 1500,
        turns: 3,
        costUsd: 0.02,
        sessionId: 'sess-456',
        result: 'Component created.',
      });
    });

    it('sends done event with errors on non-success result', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'result',
          subtype: 'error',
          duration_ms: 500,
          num_turns: 1,
          total_cost_usd: 0.005,
          session_id: 'sess-789',
          errors: ['Rate limit exceeded'],
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'done',
        subtype: 'error',
        durationMs: 500,
        turns: 1,
        costUsd: 0.005,
        sessionId: 'sess-789',
        errors: ['Rate limit exceeded'],
      });
    });

    it('sends error event and closes stream when query throws', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        (async function* () {
          throw new Error('SDK connection failed');
        })() as unknown as Query,
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'error',
        message: 'SDK connection failed',
      });
    });

    it('converts non-Error exceptions to string', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        (async function* () {
          throw 'raw string error';
        })() as unknown as Query,
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toContainEqual({
        type: 'error',
        message: 'raw string error',
      });
    });

    it('ignores unknown message types without crashing', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream(
          { type: 'some_future_type', data: 'whatever' },
          {
            type: 'result',
            subtype: 'success',
            duration_ms: 100,
            num_turns: 1,
            total_cost_usd: 0,
            session_id: 's',
            result: 'ok',
          },
        ),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      const types = events.map((e) => e.type);
      expect(types).not.toContain('some_future_type');
      expect(types).toContain('done');
    });

    it('ignores non-text_delta content_block_delta events', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'stream_event',
          event: {
            type: 'content_block_delta',
            delta: { type: 'input_json_delta', partial_json: '{"x":1}' },
          },
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toEqual([{ type: 'start', model: 'claude-sonnet-4-6' }]);
    });

    it('ignores stream_event with non-content_block_delta type', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'stream_event',
          event: { type: 'message_start', message: {} },
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toEqual([{ type: 'start', model: 'claude-sonnet-4-6' }]);
    });

    it('ignores system messages with unknown subtypes', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({ type: 'system', subtype: 'some_future_subtype' }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toEqual([{ type: 'start', model: 'claude-sonnet-4-6' }]);
    });

    it('ignores user messages with non-array content', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'user',
          message: { content: 'just a string' },
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      expect(events).toEqual([{ type: 'start', model: 'claude-sonnet-4-6' }]);
    });

    it('skips non-tool_result blocks in user message content', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream({
          type: 'user',
          message: {
            content: [
              { type: 'text', text: 'some user text' },
              {
                type: 'tool_result',
                tool_use_id: 'tool-1',
                is_error: false,
                content: 'ok',
              },
            ],
          },
        }),
      );

      const res = await callPost({ prompt: 'hello' });
      const events = await readSSEEvents(res);
      const toolResults = events.filter((e) => e.type === 'tool_result');
      expect(toolResults).toHaveLength(1);
      expect(toolResults[0]).toMatchObject({ toolUseId: 'tool-1' });
    });

    it('passes sessionId to buildOptions', async () => {
      const { mockQuery, agentModule } = await setupStreamTest();
      const buildOptionsSpy = vi.spyOn(agentModule, 'buildOptions');
      mockQuery.mockReturnValue(fakeStream());

      await callPost({
        prompt: 'hello',
        sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      });

      expect(buildOptionsSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        }),
      );
    });

    it('does not pass sessionId when omitted', async () => {
      const { mockQuery, agentModule } = await setupStreamTest();
      const buildOptionsSpy = vi.spyOn(agentModule, 'buildOptions');
      mockQuery.mockReturnValue(fakeStream());

      await callPost({ prompt: 'hello' });

      expect(buildOptionsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: undefined }),
      );
    });

    it('streams a full conversation sequence in order', async () => {
      const { mockQuery } = await setupStreamTest();
      mockQuery.mockReturnValue(
        fakeStream(
          {
            type: 'system',
            subtype: 'init',
            session_id: 'sess-full',
            apiKeySource: 'oauth',
          },
          {
            type: 'stream_event',
            event: {
              type: 'content_block_delta',
              delta: { type: 'text_delta', text: 'Creating Button' },
            },
          },
          {
            type: 'assistant',
            message: {
              content: [
                {
                  type: 'tool_use',
                  id: 'w1',
                  name: 'Write',
                  input: { file_path: 'Button.tsx' },
                },
              ],
            },
          },
          {
            type: 'user',
            message: {
              content: [
                { type: 'tool_result', tool_use_id: 'w1', content: 'Done' },
              ],
            },
          },
          {
            type: 'result',
            subtype: 'success',
            duration_ms: 2000,
            num_turns: 2,
            total_cost_usd: 0.03,
            session_id: 'sess-full',
            result: 'Button component created.',
          },
        ),
      );

      const res = await callPost({ prompt: 'build a button' });
      const events = await readSSEEvents(res);
      const types = events.map((e) => e.type);
      expect(types).toEqual([
        'start',
        'session',
        'text_delta',
        'tool_use',
        'tool_result',
        'done',
      ]);
    });
  });
});

// ---------- GET handler ----------

describe('GET /api/chat', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns auth status as JSON when authenticated', async () => {
    const agentModule = await import('@/lib/agent');
    vi.spyOn(agentModule, 'detectClaudeAuth').mockResolvedValue({
      hasOauthCredentials: true,
      credentialsPath: '/home/user/.claude/.credentials.json',
    });

    const { GET } = await import('../route');
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.hasOauthCredentials).toBe(true);
    expect(data.credentialsPath).toBe('/home/user/.claude/.credentials.json');
  });

  it('returns false when no credentials are found', async () => {
    const agentModule = await import('@/lib/agent');
    vi.spyOn(agentModule, 'detectClaudeAuth').mockResolvedValue({
      hasOauthCredentials: false,
      credentialsPath: '/home/user/.claude/.credentials.json',
    });

    const { GET } = await import('../route');
    const res = await GET();
    const data = await res.json();
    expect(data.hasOauthCredentials).toBe(false);
  });
});
