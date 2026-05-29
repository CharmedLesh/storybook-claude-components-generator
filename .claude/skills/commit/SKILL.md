---
name: commit
description: Use this skill whenever the user asks to commit changes, stage and commit files, or says things like "commit everything", "commit my changes", "make a commit", or "git commit". This skill runs `git add .` to stage all changes, inspects the diff to generate a concise descriptive commit message, then commits with that message — all without asking the user to supply the message themselves.
---

# Commit Skill

Commit all current changes with an auto-generated descriptive message.

## Steps

1. **Check for changes**
   ```bash
   git status --short
   ```
   If the working tree is clean, tell the user there is nothing to commit and stop.

2. **Inspect the diff**
   ```bash
   git diff HEAD
   ```
   Read the output to understand what changed. Also check untracked files via `git status --short` for any new files.

3. **Generate a commit message**
   Write a short, imperative-mood subject line (≤72 characters) that describes *what* the commit does, based on the diff. Examples:
   - `Add user authentication middleware`
   - `Fix null pointer error in payment processor`
   - `Refactor database connection pooling`
   - `Update README with installation steps`

   Rules:
   - Start with a capital letter, no trailing period
   - Use imperative mood ("Add", "Fix", "Update", not "Added", "Fixed", "Updated")
   - Be specific — mention the affected area or component
   - Do **not** ask the user to confirm or edit the message; just use it

4. **Stage and commit**
   ```bash
   git add .
   git commit -m "<generated message>"
   ```

5. **Confirm**
   Show the user the commit hash and message, e.g.:
   > Committed: `a3f9c12` — "Add user authentication middleware"