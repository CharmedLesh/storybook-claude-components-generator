@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

A two-pane workbench for generating React + Storybook components with Claude. The Next.js app on `:3000` hosts a chat UI on the left; the right pane is an `<iframe>` pointing at the Storybook dev server on `:6006`. The chat panel POSTs to `/api/chat`, which calls `query()` from `@anthropic-ai/claude-agent-sdk` and streams events back over SSE. Claude writes/edits files in `src/generated/`; Storybook's `stories` glob picks them up and the iframe auto-reloads.

**Two dev processes are required.** Without Storybook running, the right pane shows a "not reachable" placeholder. Use `npm run dev:all` (concurrently) or run them in separate terminals.

## Commands

| Task | Command |
|---|---|
| Run both dev servers | `npm run dev:all` |
| Run only Next.js (port 3000) | `npm run dev` |
| Run only Storybook (port 6006) | `npm run storybook` |
| Production build (also type-checks) | `npm run build` |
| Lint | `npm run lint` |
| Build Storybook statically | `npm run build-storybook` |

Run `npm test` (or `npm run test:watch` in watch mode) for unit tests. They run in the `unit` vitest project (Node environment). A separate `storybook` vitest project exists for Storybook browser tests.

## Auth model — Claude CLI OAuth, not API key

The app intentionally uses the user's logged-in `claude` CLI session (Pro/Max subscription) rather than `ANTHROPIC_API_KEY`. `src/lib/agent.ts::buildAgentEnv()` actively strips `ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` from the subprocess environment before handing it to the SDK — because the SDK would otherwise prefer the API key, defeating the subscription billing. Do not "fix" this by passing the API key through; it's deliberate.

The route handler probes `~/.claude/.credentials.json` (or `%USERPROFILE%\.claude\.credentials.json` on Windows) on `GET /api/chat` and the page render. If the file is missing, the UI shows a "run `claude login`" banner instead of the chat input.

## Sandbox

Claude's filesystem access is constrained by **three layers** in `src/lib/agent.ts::buildOptions()` — all three matter, don't weaken any:

1. `cwd: GENERATED_DIR` — the agent's working directory is `<repo>/src/generated/`. Relative tool paths resolve there.
2. `tools: ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'TodoWrite']` and `disallowedTools: ['Bash', 'WebFetch', 'WebSearch', 'Task', 'Agent']` — restricts the surface.
3. `canUseTool: canUseToolSandboxed` — runtime path validation. Rejects any tool call whose resolved path escapes `src/generated/`.

## Two non-obvious gotchas (do not regress)

**`canUseTool` must return `updatedInput`.** The SDK's runtime Zod validator requires `updatedInput: Record<string, unknown>` on the `allow` variant even though the TypeScript type marks it optional. Returning bare `{ behavior: 'allow' }` fails Zod's union validation and rejects every tool call with a confusing error. The `allow()` helper in `agent.ts` echoes the input through; preserve that pattern.

**Storybook's `preview.tsx` must import the project's Tailwind stylesheet.** `storybook init` doesn't wire this up. Without `import '../src/app/globals.css'` in `.storybook/preview.tsx`, the Storybook iframe loads zero CSS and every Tailwind utility in generated components silently no-ops — components render unstyled and look broken even though the code is correct.

## Streaming protocol (`/api/chat`)

`POST` body: `{ prompt: string, model?: ModelId, sessionId?: string }`. The route opens an SSE stream and forwards SDK messages as discriminated-union JSON events: `start`, `session` (carries `sessionId` + `apiKeySource`), `text_delta`, `tool_use`, `tool_result`, `permission_denied`, `done`, `error`. The client (`ChatPanel.tsx`) parses each `data: ...\n\n` frame and updates the in-flight assistant message.

**Multi-turn is via `resume`, not message history.** Each POST sends only the latest user message; the client captures the `sessionId` from the SDK's `init` event and replays it as `resume: sessionId` on the next POST. Clearing the chat resets `sessionId` to start a fresh session. Do not switch to sending full message history on the wire — the SDK manages conversation state via session files in `~/.claude/projects/<encoded-cwd>/`.

## Model list

`src/lib/models.ts` is intentionally split from `agent.ts` so the client (`ModelPicker.tsx`, `ChatPanel.tsx`) can import it without pulling in server-only code (`@anthropic-ai/claude-agent-sdk`, `node:fs`, `node:path`). When adding a model, update `AVAILABLE_MODELS` here and verify the bare model string is accepted by the Agent SDK — date-suffixed IDs sometimes are not.

## System prompt

`agent.ts::buildOptions()` uses `systemPrompt: { type: 'preset', preset: 'claude_code', append: SYSTEM_PROMPT_APPEND }`. The preset preserves Claude Code's default tool-aware persona; `SYSTEM_PROMPT_APPEND` layers on project conventions (folder-per-component, `@storybook/nextjs-vite` imports, Tailwind only, no `clsx`). Replace `append` with a bare string only if you want to drop the Claude Code defaults entirely — usually you don't.

## Code style

Use comments sparingly. Only comment complex code — non-obvious invariants, workarounds, or surprising behavior. Don't narrate what well-named code already says.
