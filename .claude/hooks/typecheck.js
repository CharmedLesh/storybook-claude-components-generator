#!/usr/bin/env node
const { execSync } = require("child_process");

try {
  execSync("npm run typecheck", { stdio: "pipe", encoding: "utf8" });
  // tsc exited 0 — no type errors. Allow the stop.
  process.exit(0);
} catch (err) {
  // tsc found errors (non-zero exit). Surface them to Claude.
  const output = (err.stdout || "") + (err.stderr || "");
  console.error(
    "Type check failed. Fix these TypeScript errors before finishing:\n\n" + output
  );
  process.exit(2);
}