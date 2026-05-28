import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CanUseTool, Options, PermissionResult } from '@anthropic-ai/claude-agent-sdk';
import { AVAILABLE_MODELS, type ModelId } from './models';

export const GENERATED_DIR = path.resolve(process.cwd(), 'src', 'generated');
export const GLOBALS_CSS = path.resolve(process.cwd(), 'src', 'app', 'globals.css');

/**
 * Bump globals.css mtime to trigger Vite -> PostCSS -> Tailwind v4 rescan.
 * Tailwind's @tailwindcss/postcss plugin doesn't reliably notice classes in
 * directories created mid-session; touching the CSS entrypoint forces a
 * full content walk that picks them up. Best-effort: a dev convenience that
 * must never fail the API response.
 */
export async function nudgeTailwindRescan(): Promise<void> {
  const now = new Date();
  try {
    await fs.utimes(GLOBALS_CSS, now, now);
  } catch {
    // ignore
  }
}

export function isValidModel(id: string): id is ModelId {
  return AVAILABLE_MODELS.some((m) => m.id === id);
}

/**
 * Strip ANTHROPIC_API_KEY / AUTH_TOKEN so the Agent SDK falls through
 * to the logged-in `claude` CLI OAuth session (Pro/Max subscription).
 * The SDK's `env` option REPLACES process.env entirely, so we spread it.
 */
export function buildAgentEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k === 'ANTHROPIC_API_KEY' || k === 'ANTHROPIC_AUTH_TOKEN') continue;
    env[k] = v;
  }
  env.CLAUDE_AGENT_SDK_CLIENT_APP = 'storybook-claude-components-generator/0.1.0';
  return env;
}

/**
 * Locate the Claude CLI OAuth credentials file. The SDK auto-reads it when
 * no ANTHROPIC_API_KEY is set, so we use its presence as a "logged in" probe.
 */
export async function detectClaudeAuth(): Promise<{
  hasOauthCredentials: boolean;
  credentialsPath: string;
}> {
  const dir = process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude');
  const credentialsPath = path.join(dir, '.credentials.json');
  let hasOauthCredentials = false;
  try {
    await fs.access(credentialsPath);
    hasOauthCredentials = true;
  } catch {
    hasOauthCredentials = false;
  }
  return { hasOauthCredentials, credentialsPath };
}

/**
 * Reject any file-tool call whose path resolves outside src/generated/.
 * Reject any tool that isn't on the safe list.
 */
const SAFE_TOOLS = new Set([
  'Read',
  'Write',
  'Edit',
  'MultiEdit',
  'Glob',
  'Grep',
  'TodoWrite',
]);

function pathFromInput(input: Record<string, unknown>): string | null {
  const candidate =
    (input.file_path as string | undefined) ??
    (input.path as string | undefined) ??
    (input.target_file as string | undefined) ??
    null;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : null;
}

function isInsideGenerated(absPath: string): boolean {
  const rel = path.relative(GENERATED_DIR, absPath);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

export const canUseToolSandboxed: CanUseTool = async (toolName, input) => {
  if (!SAFE_TOOLS.has(toolName)) {
    return deny(
      `Tool "${toolName}" is disabled in this app. Use Read, Write, Edit, Glob, Grep, or TodoWrite.`,
    );
  }

  // Read/Write/Edit need a single file path
  if (
    toolName === 'Read' ||
    toolName === 'Write' ||
    toolName === 'Edit' ||
    toolName === 'MultiEdit'
  ) {
    const p = pathFromInput(input);
    if (!p) return deny(`${toolName} requires a file path.`);
    const abs = path.isAbsolute(p) ? p : path.resolve(GENERATED_DIR, p);
    if (!isInsideGenerated(abs)) {
      return deny(
        `Path "${p}" is outside the sandbox. Stay inside src/generated/.`,
      );
    }
    return allow(input);
  }

  // Glob / Grep take a `path` field that scopes the search root.
  if (toolName === 'Glob' || toolName === 'Grep') {
    const p = (input.path as string | undefined) ?? GENERATED_DIR;
    const abs = path.isAbsolute(p) ? p : path.resolve(GENERATED_DIR, p);
    if (!isInsideGenerated(abs)) {
      return deny(`Search path "${p}" is outside src/generated/.`);
    }
    return allow(input);
  }

  return allow(input);
};

// The SDK's runtime Zod schema requires `updatedInput` to be a record on the
// allow variant, even though the TS type marks it optional. Always echo the
// original input back unless we're rewriting it.
function allow(input: Record<string, unknown>): PermissionResult {
  return { behavior: 'allow', updatedInput: input };
}
function deny(message: string): PermissionResult {
  return { behavior: 'deny', message };
}

export const SYSTEM_PROMPT_APPEND = `
You are helping the user build a React + Storybook component library.

# Working directory
Your cwd is the project's \`src/generated/\` directory. All file operations
must stay inside it — paths can be relative (preferred) or absolute. Tools
that escape the sandbox will be denied.

# Stack
- React 19, TypeScript (strict), Tailwind CSS v4
- Storybook 10 with the \`@storybook/nextjs-vite\` framework
- Storybook auto-discovers \`*.stories.tsx\` files in this directory

# What to produce
For each component request, create at minimum:
1. \`<Name>/<Name>.tsx\` — the component, functional, named export, explicit prop interface
2. \`<Name>/<Name>.stories.tsx\` — Storybook stories covering main variants

Stories must use \`@storybook/nextjs-vite\`:

\`\`\`tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Button>;
export const Primary: Story = { args: { variant: 'primary', children: 'Click' } };
\`\`\`

# Conventions
- No \`any\`. Always type props with an exported interface.
- Style with Tailwind utilities. Don't import \`clsx\` — it isn't installed; join class strings inline.
- Co-locate types in the component file and export them.
- Include \`tags: ['autodocs']\` on every Meta.
- Prefer semantic HTML and add ARIA only where it actually helps.

# Workflow
- For new components, jump straight to writing files.
- For edits, use \`Read\` or \`Glob\` first so you don't clobber unrelated changes.
- Use \`Grep\` to find call sites if the user mentions an existing component by name.
- Be terse in your text replies; the user reads the code.
`;

export function buildOptions(args: {
  model: ModelId;
  abortSignal: AbortSignal;
  sessionId?: string;
}): Options {
  return {
    cwd: GENERATED_DIR,
    model: args.model,
    env: buildAgentEnv(),
    systemPrompt: {
      type: 'preset',
      preset: 'claude_code',
      append: SYSTEM_PROMPT_APPEND,
    },
    tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'TodoWrite'],
    disallowedTools: ['Bash', 'WebFetch', 'WebSearch', 'Task', 'Agent'],
    permissionMode: 'default',
    canUseTool: canUseToolSandboxed,
    includePartialMessages: true,
    abortController: toAbortController(args.abortSignal),
    maxTurns: 25,
    settingSources: [],
    ...(args.sessionId ? { resume: args.sessionId } : {}),
  };
}

function toAbortController(signal: AbortSignal): AbortController {
  const ctrl = new AbortController();
  if (signal.aborted) ctrl.abort();
  else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  return ctrl;
}

export async function ensureGeneratedDir(): Promise<void> {
  await fs.mkdir(GENERATED_DIR, { recursive: true });
}
