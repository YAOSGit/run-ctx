---
title: Command Executor
teleport:
  file: src/utils/executor/index.ts
  line: 41
  highlight: execute
actions:
  - label: Run tests
    command: npx vitest run src/utils/executor/executor.test.ts
validate:
  command: npx vitest run src/utils/executor/executor.test.ts --reporter=silent 2>&1 | grep -q "pass"
  hint: Executor tests should pass before moving on
required: true
---

# Command Executor

## How it works
The `execute` function is the final stage of the pipeline. It takes the resolved command string and passthrough args, then spawns the process using `spawnCommand` from the shared toolkit.

## Execution modes
There are two modes: direct execution (default) parses the command into program + args using `parseCommand` and spawns it directly. Shell mode (`--shell` flag or rule-level `shell: true`) joins everything into a single string and runs it through the system shell, enabling pipes, redirects, and `&&` chaining.

## Key details
- `parseCommand` (line 8) handles quoted arguments correctly, supporting both single and double quotes in the command string.
- Passthrough args are appended after the resolved command's own arguments.
- The exit code from the spawned process is propagated back to the caller.
