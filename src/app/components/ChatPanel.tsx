'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AVAILABLE_MODELS, DEFAULT_MODEL, type ModelId } from '@/lib/models';
import { ModelPicker } from './ModelPicker';

type ToolEvent = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  summary?: string;
  status: 'running' | 'done' | 'error';
};

type UiMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  tools: ToolEvent[];
};

type Props = {
  authReady: boolean;
  credentialsPath: string;
  onComponentsWritten: () => void;
};

const MODEL_STORAGE_KEY = 'chat:model';
const MODEL_CHOSEN_KEY = 'chat:model:chosen';

export function ChatPanel({ authReady, credentialsPath, onComponentsWritten }: Props) {
  const [model, setModel] = useState<ModelId>(DEFAULT_MODEL);
  const [modelChosen, setModelChosen] = useState<boolean>(false);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [apiKeySource, setApiKeySource] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (saved && AVAILABLE_MODELS.some((m) => m.id === saved)) {
      setModel(saved as ModelId);
    }
    setModelChosen(window.localStorage.getItem(MODEL_CHOSEN_KEY) === '1');
  }, []);

  useEffect(() => {
    window.localStorage.setItem(MODEL_STORAGE_KEY, model);
  }, [model]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const confirmModel = () => {
    window.localStorage.setItem(MODEL_CHOSEN_KEY, '1');
    setModelChosen(true);
  };

  const send = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isStreaming || !authReady) return;

      const userMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        text: trimmed,
        tools: [],
      };
      const assistantMsg: UiMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: '',
        tools: [],
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput('');
      setIsStreaming(true);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;
      let touchedFiles = false;

      try {
        const resp = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            prompt: trimmed,
            model,
            sessionId: sessionId ?? undefined,
          }),
          signal: controller.signal,
        });

        if (!resp.ok || !resp.body) {
          const text = await resp.text().catch(() => '');
          throw new Error(text || `HTTP ${resp.status}`);
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let lineEnd: number;
          while ((lineEnd = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, lineEnd);
            buffer = buffer.slice(lineEnd + 2);
            const dataLine = rawEvent.split('\n').find((l) => l.startsWith('data: '));
            if (!dataLine) continue;
            const payload = dataLine.slice(6);
            try {
              const evt = JSON.parse(payload);
              const wroteFile = applyEvent(assistantMsg.id, evt);
              if (wroteFile) touchedFiles = true;
            } catch {
              /* ignore */
            }
          }
        }

        if (touchedFiles) onComponentsWritten();
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') setError(err.message);
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [authReady, isStreaming, model, onComponentsWritten, sessionId],
  );

  const applyEvent = (
    assistantId: string,
    evt: { type: string } & Record<string, unknown>,
  ): boolean => {
    let touchedFile = false;
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== assistantId) return m;
        switch (evt.type) {
          case 'text_delta':
            return { ...m, text: m.text + String(evt.text ?? '') };
          case 'tool_use':
            return {
              ...m,
              tools: [
                ...m.tools,
                {
                  id: String(evt.id),
                  name: String(evt.name),
                  input: (evt.input as Record<string, unknown>) ?? {},
                  status: 'running',
                },
              ],
            };
          case 'tool_result': {
            const tid = String(evt.toolUseId);
            return {
              ...m,
              tools: m.tools.map((t) => {
                if (t.id !== tid) return t;
                if (t.name === 'Write' || t.name === 'Edit' || t.name === 'MultiEdit') {
                  touchedFile = true;
                }
                return {
                  ...t,
                  status: evt.isError ? 'error' : 'done',
                  summary: typeof evt.summary === 'string' ? evt.summary : '',
                };
              }),
            };
          }
          default:
            return m;
        }
      }),
    );

    if (evt.type === 'session') {
      if (typeof evt.sessionId === 'string') setSessionId(evt.sessionId);
      if (typeof evt.apiKeySource === 'string') setApiKeySource(evt.apiKeySource);
    } else if (evt.type === 'error') {
      setError(String(evt.message ?? 'Unknown error'));
    } else if (evt.type === 'permission_denied') {
      setError(`Permission denied for tool ${evt.toolName}: ${evt.message}`);
    } else if (evt.type === 'done' && typeof evt.sessionId === 'string') {
      setSessionId(evt.sessionId);
    }

    return touchedFile;
  };

  const cancel = () => abortRef.current?.abort();

  const clearChat = () => {
    if (isStreaming) return;
    setMessages([]);
    setSessionId(null);
    setApiKeySource(null);
    setError(null);
  };

  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-4 py-3">
        <div>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Claude Components
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Writes to <code className="font-mono">src/generated/</code>
            {apiKeySource && (
              <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                · auth: {apiKeySource === 'none' ? 'claude cli' : apiKeySource}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModelPicker value={model} onChange={setModel} disabled={isStreaming} />
          <button
            onClick={clearChat}
            disabled={isStreaming || messages.length === 0}
            className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      </header>

      {!authReady && <AuthMissingBanner credentialsPath={credentialsPath} />}

      {authReady && !modelChosen && messages.length === 0 && (
        <FirstRunModelPicker value={model} onChange={setModel} onConfirm={confirmModel} />
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && authReady && modelChosen && <EmptyState />}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {error && (
          <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-200">
            {error}
          </div>
        )}
      </div>

      <Composer
        value={input}
        onChange={setInput}
        onSend={() => send(input)}
        onCancel={cancel}
        isStreaming={isStreaming}
        disabled={!authReady}
      />
    </>
  );
}

function AuthMissingBanner({ credentialsPath }: { credentialsPath: string }) {
  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-medium">No Claude CLI session found</p>
      <p className="mt-1 text-xs">
        This app uses your logged-in Claude Pro/Max subscription via the Claude
        CLI. To enable it:
      </p>
      <ol className="mt-1 text-xs list-decimal list-inside space-y-0.5">
        <li>
          <code className="font-mono">npm install -g @anthropic-ai/claude-code</code>
        </li>
        <li>
          <code className="font-mono">claude login</code>
        </li>
        <li>Reload this page.</li>
      </ol>
      <p className="mt-1 text-xs opacity-70">
        Checked: <code className="font-mono">{credentialsPath}</code>
      </p>
    </div>
  );
}

function FirstRunModelPicker({
  value,
  onChange,
  onConfirm,
}: {
  value: ModelId;
  onChange: (v: ModelId) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-4">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        Pick a default model
      </h2>
      <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        You can change this any time in the header.
      </p>
      <div className="mt-3 grid gap-2">
        {AVAILABLE_MODELS.map((m) => (
          <label
            key={m.id}
            className={`flex cursor-pointer items-start gap-3 rounded border px-3 py-2 text-sm ${
              value === m.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40'
                : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <input
              type="radio"
              name="model"
              value={m.id}
              checked={value === m.id}
              onChange={() => onChange(m.id)}
              className="mt-1"
            />
            <div>
              <div className="font-medium text-zinc-900 dark:text-zinc-100">{m.label}</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">{m.description}</div>
            </div>
          </label>
        ))}
      </div>
      <button
        onClick={onConfirm}
        className="mt-3 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        Use {AVAILABLE_MODELS.find((m) => m.id === value)?.label}
      </button>
    </div>
  );
}

function EmptyState() {
  const examples = [
    'Create a primary Button with size variants (sm/md/lg) and a loading state.',
    'Build a Card component with a header, body, and optional footer.',
    'Add a Toggle/Switch component with controlled and uncontrolled modes.',
  ];
  return (
    <div className="text-sm text-zinc-600 dark:text-zinc-400">
      <p>Ask Claude to build a component. Some ideas:</p>
      <ul className="mt-2 space-y-1">
        {examples.map((e) => (
          <li key={e} className="rounded bg-zinc-100 dark:bg-zinc-800 px-3 py-2">
            {e}
          </li>
        ))}
      </ul>
    </div>
  );
}

function MessageBubble({ message }: { message: UiMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[95%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
        }`}
      >
        {message.text || (isUser ? '' : <span className="italic opacity-60">…</span>)}
        {message.tools.length > 0 && (
          <div className="mt-2 space-y-1">
            {message.tools.map((t) => (
              <ToolBadge key={t.id} tool={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBadge({ tool }: { tool: ToolEvent }) {
  const path =
    (tool.input?.file_path as string | undefined) ??
    (tool.input?.path as string | undefined) ??
    (tool.input?.pattern as string | undefined) ??
    '';
  const label = path ? `${tool.name} ${path}` : tool.name;
  const dotColor =
    tool.status === 'done'
      ? 'bg-emerald-500'
      : tool.status === 'error'
        ? 'bg-red-500'
        : 'bg-amber-500 animate-pulse';
  return (
    <div className="flex items-start gap-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-2 py-1 text-xs">
      <span className={`mt-1 inline-block h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
      <div className="min-w-0">
        <div className="font-mono text-zinc-700 dark:text-zinc-300 truncate">{label}</div>
        {tool.summary && (
          <div className="text-zinc-500 dark:text-zinc-500 truncate">{tool.summary}</div>
        )}
      </div>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onCancel,
  isStreaming,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onCancel: () => void;
  isStreaming: boolean;
  disabled: boolean;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSend();
      }}
      className="border-t border-zinc-200 dark:border-zinc-800 p-3"
    >
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={
          disabled
            ? 'Run `claude login` first to enable Claude…'
            : 'Describe the component you want. Cmd/Ctrl+Enter to send.'
        }
        disabled={disabled || isStreaming}
        rows={3}
        className="w-full resize-none rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-zinc-500 dark:text-zinc-500">
          {isStreaming ? 'Streaming…' : 'Cmd/Ctrl + Enter to send'}
        </span>
        {isStreaming ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded bg-zinc-200 dark:bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 hover:bg-zinc-300 dark:hover:bg-zinc-600"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={disabled || !value.trim()}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        )}
      </div>
    </form>
  );
}
