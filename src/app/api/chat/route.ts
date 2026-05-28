import { NextRequest } from 'next/server';
import { query } from '@anthropic-ai/claude-agent-sdk';
import {
  buildOptions,
  detectClaudeAuth,
  ensureGeneratedDir,
  isValidModel,
  nudgeTailwindRescan,
} from '@/lib/agent';
import { DEFAULT_MODEL } from '@/lib/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PROMPT_LENGTH = 50_000;
const SESSION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ChatRequestBody = {
  prompt?: string;
  model?: string;
  sessionId?: string;
};

function sseChunk(data: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

export async function POST(req: NextRequest) {
  let body: ChatRequestBody;
  try {
    body = (await req.json()) as ChatRequestBody;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return new Response(JSON.stringify({ error: 'empty_prompt' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (prompt.length > MAX_PROMPT_LENGTH) {
    return new Response(
      JSON.stringify({ error: 'prompt_too_long', maxLength: MAX_PROMPT_LENGTH }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  const model = body.model && isValidModel(body.model) ? body.model : DEFAULT_MODEL;
  const sessionId =
    typeof body.sessionId === 'string' && SESSION_ID_RE.test(body.sessionId)
      ? body.sessionId
      : undefined;

  const { hasOauthCredentials, credentialsPath } = await detectClaudeAuth();
  if (!hasOauthCredentials) {
    return new Response(
      JSON.stringify({
        error: 'no_claude_session',
        message: `No Claude CLI session found at ${credentialsPath}. Install the CLI ('npm install -g @anthropic-ai/claude-code') and run 'claude login'.`,
      }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  await ensureGeneratedDir();

  const abortController = new AbortController();
  req.signal.addEventListener('abort', () => abortController.abort(), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(sseChunk(data));
        } catch {
          // controller already closed
        }
      };

      const q = query({
        prompt,
        options: buildOptions({
          model,
          sessionId,
          abortSignal: abortController.signal,
        }),
      });

      let agentWroteFiles = false;

      try {
        send({ type: 'start', model });

        for await (const msg of q) {
          switch (msg.type) {
            case 'system': {
              if (msg.subtype === 'init') {
                send({
                  type: 'session',
                  sessionId: msg.session_id,
                  apiKeySource: msg.apiKeySource,
                });
              } else if (msg.subtype === 'permission_denied') {
                send({
                  type: 'permission_denied',
                  toolName: msg.tool_name,
                  message: msg.message,
                });
              }
              break;
            }

            case 'stream_event': {
              const event = msg.event;
              if (
                event.type === 'content_block_delta' &&
                event.delta.type === 'text_delta'
              ) {
                send({ type: 'text_delta', text: event.delta.text });
              }
              break;
            }

            case 'assistant': {
              for (const block of msg.message.content) {
                if (block.type === 'tool_use') {
                  if (
                    block.name === 'Write' ||
                    block.name === 'Edit' ||
                    block.name === 'MultiEdit'
                  ) {
                    agentWroteFiles = true;
                  }
                  send({
                    type: 'tool_use',
                    id: block.id,
                    name: block.name,
                    input: block.input,
                  });
                }
              }
              if (msg.error) {
                send({ type: 'error', message: `Model error: ${msg.error}` });
              }
              break;
            }

            case 'user': {
              const content = msg.message.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (typeof block === 'object' && block && 'type' in block) {
                    if ((block as { type: string }).type === 'tool_result') {
                      const tr = block as {
                        type: 'tool_result';
                        tool_use_id: string;
                        is_error?: boolean;
                        content?: unknown;
                      };
                      send({
                        type: 'tool_result',
                        toolUseId: tr.tool_use_id,
                        isError: Boolean(tr.is_error),
                        summary: summarizeToolResult(tr.content),
                      });
                    }
                  }
                }
              }
              break;
            }

            case 'result': {
              send({
                type: 'done',
                subtype: msg.subtype,
                durationMs: msg.duration_ms,
                turns: msg.num_turns,
                costUsd: msg.total_cost_usd,
                sessionId: msg.session_id,
                ...(msg.subtype !== 'success'
                  ? { errors: msg.errors }
                  : { result: msg.result }),
              });
              break;
            }

            default:
              break;
          }
        }

        if (agentWroteFiles) await nudgeTailwindRescan();
        controller.close();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send({ type: 'error', message });
        if (agentWroteFiles) await nudgeTailwindRescan();
        controller.close();
      }
    },

    cancel() {
      abortController.abort();
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store, no-transform',
      connection: 'keep-alive',
    },
  });
}

export function summarizeToolResult(content: unknown): string {
  if (typeof content === 'string') {
    return truncate(content, 200);
  }
  if (Array.isArray(content)) {
    const text = content
      .map((b) => {
        if (typeof b === 'string') return b;
        if (b && typeof b === 'object' && 'text' in b) return String((b as { text: unknown }).text);
        return '';
      })
      .join('\n');
    return truncate(text, 200);
  }
  return '';
}

export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n) + '…';
}

export async function GET() {
  const { hasOauthCredentials, credentialsPath } = await detectClaudeAuth();
  return new Response(
    JSON.stringify({ hasOauthCredentials, credentialsPath }),
    { headers: { 'content-type': 'application/json' } },
  );
}
