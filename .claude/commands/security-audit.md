---
description: Detect security vulnerabilities, fix them, and cover each fix with tests
argument-hint: [optional: path, file, or area to focus on]
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Security Audit & Fix

You are performing a security audit on this web application. Your goal is to **detect vulnerabilities, fix them safely, and lock each fix in place with tests**.

Optional focus from the user: `$ARGUMENTS`
(If empty, audit the whole codebase. If a path/file/area is given, scope the audit to that.)

Work through the following steps **in order**. Do not skip ahead.

## Step 1 — Establish a green baseline (run tests first)

Before changing anything, confirm the existing test suite passes so you know the starting state is healthy and any later failure is caused by your changes.

1. Run the `npm run test` script.
2. Report the result:
   - **If tests pass:** record this as the baseline and continue to Step 2.
   - **If tests fail:** STOP. Do not begin the security work. Show the failures and ask the user whether to fix the broken tests first or proceed anyway. A red baseline makes it impossible to attribute later failures to security fixes.

## Step 2 — Detect vulnerabilities

Audit the code (scoped by `$ARGUMENTS` if provided) for security issues. Check at least:

- **Injection** — SQL/NoSQL injection, command injection, unsafe `eval`/deserialization.
- **XSS** — unescaped output, dangerous DOM sinks (`innerHTML`, `dangerouslySetInnerHTML`), unsanitized user input rendered to pages.
- **AuthN / AuthZ** — missing or broken access controls, insecure session handling, privilege checks done client-side only.
- **Secrets & config** — hardcoded credentials, API keys, tokens; secrets committed to the repo; debug/verbose modes left on.
- **Input validation** — missing validation on request bodies, query params, headers, file uploads.
- **CSRF / SSRF** — missing CSRF protection on state-changing routes; user-controlled URLs fetched server-side.
- **Sensitive data exposure** — secrets or PII in logs/responses, missing encryption in transit/at rest.
- **Dependencies** — known-vulnerable packages. Run the audit tool if available (`npm audit`, `pip-audit`, etc.).
- **Security headers & CORS** — missing CSP/HSTS, overly permissive CORS.

Produce a findings list. For each item include: **severity** (Critical / High / Medium / Low), file and line, a short description, and the recommended fix. Order findings by severity, highest first.

## Step 3 — Fix the vulnerabilities

Working from highest severity down:

1. Apply the minimal, correct fix for each vulnerability. Prefer established, idiomatic mitigations (parameterized queries, output encoding, proper auth middleware, validation libraries) over ad-hoc patches.
2. Keep changes focused — do not refactor unrelated code.
3. Do not weaken or delete existing tests just to make them pass.
4. Briefly note what each fix changed and why.

## Step 4 — Cover each fix with tests

For **every** vulnerability you fixed, add tests in the project's existing test framework and style:

1. A test proving the vulnerability is closed — e.g. a malicious/exploit input is now rejected, sanitized, or fails safely.
2. A test confirming legitimate input still behaves correctly (no regression).
3. Place tests in the appropriate location and follow existing naming conventions.

## Step 5 — Run the full test suite again

Re-run the same test script from Step 1.

- **If everything passes:** the baseline still holds and your new tests confirm the fixes.
- **If anything fails:** fix the cause (your code change or your new test) and re-run until green. Do not finish with a failing suite.

## Step 6 — Summary

Report concisely:

- Vulnerabilities found, grouped by severity.
- What was fixed and how.
- Tests added per fix.
- Final test result (baseline vs. after).
- Anything you could **not** safely auto-fix and that needs human review (e.g. architectural auth changes, dependency upgrades with breaking changes).