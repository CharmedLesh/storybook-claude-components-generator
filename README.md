# Claude Storybook Components Generator

A two-pane workbench for building React + Storybook components with Claude. Chat with Claude on the left; watch your component library appear in Storybook on the right.

- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Storybook 10 (`@storybook/nextjs-vite`).
- **Engine:** `@anthropic-ai/claude-agent-sdk` running Claude Code's agent loop in-process with the built-in `Read` / `Write` / `Edit` / `Glob` / `Grep` tools.
- **Auth:** your logged-in **Claude CLI session** (Pro/Max subscription). No API key needed.
- **Models:** Opus 4.7, Sonnet 4.6, Haiku 4.5 — pick on first run; switch any time.
- **Output:** Files land in `src/generated/`. Storybook auto-discovers them.

## Setup

1. **Install the Claude CLI and log in** (one-time):

   ```bash
   npm install -g @anthropic-ai/claude-code
   claude login
   ```

   This stores an OAuth token at `~/.claude/.credentials.json` (Windows: `%USERPROFILE%\.claude\.credentials.json`). The Agent SDK reuses it, so calls bill against your Claude subscription instead of metered API tokens.

2. **Install project dependencies** (already done if you scaffolded this — otherwise):

   ```bash
   npm install
   ```

3. **Run both dev servers** (Next.js on `:3000`, Storybook on `:6006`):

   ```bash
   npm run dev:all
   ```

   Or run them separately in two terminals:

   ```bash
   npm run dev          # Next.js (the chat UI)
   npm run storybook    # Storybook (the component viewer)
   ```

4. Open <http://localhost:3000>.

> **About `ANTHROPIC_API_KEY`:** if you have this env var set system-wide, the Agent SDK would normally prefer it over the OAuth session. This app explicitly strips it from the subprocess environment so your Pro/Max subscription is always used. To verify, watch the header — it shows `auth: oauth` once Claude responds.

## How it works

- The chat panel POSTs to `/api/chat`, which calls `query()` from `@anthropic-ai/claude-agent-sdk`.
- The SDK runs the full Claude Code agent loop in-process: it streams text, calls built-in tools, and returns when the model is done.
- We sandbox the agent to `src/generated/` two ways:
  - `cwd: <repo>/src/generated/` — the working directory the agent starts in
  - A `canUseTool` callback that rejects any `Read` / `Write` / `Edit` / `Glob` / `Grep` whose resolved path escapes that directory
- `Bash`, `WebFetch`, `WebSearch`, and `Task`/`Agent` (subagents) are disabled.
- Multi-turn conversations are continued via the SDK's `resume: sessionId` option. The session ID is captured from the `init` event and replayed on each follow-up POST.
- Storybook is iframed from `http://localhost:6006`. When Claude writes/edits a file, the iframe reloads to surface it.

## Customizing

- **Storybook URL:** set `NEXT_PUBLIC_STORYBOOK_URL` in `.env.local` if you run Storybook elsewhere.
- **System prompt / sandbox rules / allowed tools:** edit `src/lib/agent.ts`. The Claude Code preset is used with an `append:` block; remove or replace it for a fresh persona.
- **Where files are written:** edit `GENERATED_DIR` in `src/lib/agent.ts` (and update the Storybook `stories` glob in `.storybook/main.ts` to match).

## Project layout

```
src/
  app/
    api/chat/route.ts        # streaming /api/chat — calls query() from the Agent SDK
    components/              # chat UI, split-pane shell, Storybook iframe
    page.tsx
  generated/                 # ← Claude writes here; Storybook reads from here
  lib/
    agent.ts                 # query() options, canUseTool sandbox, system-prompt append
    models.ts                # model catalog (shared client/server)
  stories/                   # Storybook's default example stories (safe to delete)
.storybook/
  main.ts
  preview.tsx
```
