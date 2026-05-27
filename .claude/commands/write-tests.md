---
description: Write tests for the given code following project conventions, covering happy paths, edge cases, and error states
argument-hint: [file, function, or feature to test]
allowed-tools: Read, Grep, Glob, Edit, Write, Bash
---

# Write Tests

You are writing tests for this project. The goal is **thorough, conventional, maintainable** coverage — tests that match how this codebase already tests things and that exercise happy paths, edge cases, and error states.

Target from the user: `$ARGUMENTS`
(If empty, ask the user what to test before proceeding — do not guess.)

## Step 1 — Learn the project's testing conventions

Before writing a single test, infer the conventions already in use. **Match them; do not impose your own.** Inspect the codebase to determine:

- **Test runner & framework** — e.g. Jest, Vitest, Mocha, pytest, JUnit, Go's `testing`. Detect from config files and `package.json`/`pyproject.toml` scripts.
- **File location & naming** — co-located (`foo.test.ts` next to `foo.ts`) vs. a `tests/` or `__tests__/` directory; the naming pattern (`*.test.*`, `*.spec.*`, `test_*.py`).
- **Structure & style** — `describe`/`it` vs. `test`; AAA (Arrange-Act-Assert) vs. given/when/then; how setup/teardown is done (`beforeEach`, fixtures).
- **Assertion library** — built-in `expect`, Chai, `assert`, etc. Match the existing matchers.
- **Mocking/stubbing approach** — the existing mock library and patterns; how external services, DBs, time, and randomness are faked.
- **Test data** — factories, fixtures, builders, or inline literals — whichever the project favors.
- **Naming of test cases** — how existing test descriptions are phrased (e.g. "returns X when Y", "should ...").

If you find an existing test file near the target, treat it as the template for everything above. State the conventions you detected in one short block before writing tests, so the user can correct you if you misread the codebase.

## Step 2 — Read the code under test

Read the target thoroughly. Identify every observable behavior, branch, input boundary, and failure mode. List the behaviors you intend to cover before writing — this is your test plan and prevents gaps.

## Step 3 — Cover all three tiers

For the target, write tests across these tiers. Don't stop at the happy path.

### Happy paths
The expected, valid, common-case behavior.
- Typical valid inputs producing correct outputs.
- The primary success flow end-to-end for the unit.
- Each documented/intended feature behaving as specified.

### Edge cases
Valid-but-unusual inputs and boundaries.
- Boundary values: empty string/array/object, zero, negative numbers, max/min, off-by-one limits.
- Optional/missing/default parameters and `null`/`undefined` where allowed.
- Large inputs, duplicates, unicode/special characters, whitespace.
- Ordering, concurrency, or idempotency concerns if relevant.
- State-dependent behavior (first call vs. repeat call, empty vs. populated state).

### Error states
Invalid input and failure handling — assert the code fails *correctly*, not silently.
- Invalid types and malformed input → the expected validation error/exception is thrown.
- Out-of-range or forbidden values rejected with the right error.
- Failures of dependencies (network/DB/filesystem errors, timeouts) handled or surfaced correctly.
- Unauthorized/forbidden access where applicable.
- Assert the **specific** error type/message/status, not merely "it throws."

## Step 4 — Write the tests

- Follow every convention from Step 1.
- One clear behavior per test; descriptive names that read as a spec of intent.
- Keep tests deterministic: no real network, no real clock, no real randomness — mock them.
- Avoid testing implementation details; assert observable behavior and contracts.
- No interdependent tests — each must pass in isolation and in any order.
- Reuse existing fixtures/factories/helpers rather than duplicating setup.

## Step 5 — Run and verify

1. Run the project's test script (detect it as in Step 1; e.g. `npm test`, `pytest`).
2. Confirm your new tests **pass** and that you haven't broken existing ones.
3. If a test fails because it revealed a real bug in the code under test, do **not** weaken the test to make it pass — report the bug to the user and ask how to proceed.
4. Iterate until the suite is green (or until the only failures are genuine bugs you've flagged).

## Step 6 — Summary

Report concisely:
- Conventions you followed.
- Test cases added, grouped by tier (happy / edge / error).
- Any behaviors you intentionally did **not** cover and why.
- Any bugs or ambiguities the tests surfaced that need human attention.