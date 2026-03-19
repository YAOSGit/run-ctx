---
title: What is run-ctx?
teleport:
  file: src/app/cli.ts
  line: 36
  highlight: runCLI
actions:
  - label: View config loader
    command: cat src/utils/config/index.ts
validate:
  command: test -f src/app/cli.ts
  hint: Make sure you are in the run-ctx project root
required: true
---

# What is run-ctx?

## What it does
run-ctx is a context-aware command alias CLI. It lets you define aliases that resolve to different commands depending on your current working directory, environment variables, and file presence. Think of it as shell aliases with CSS-like specificity scoring.

## How it works
The `runCLI` function is the main entry point. It uses Commander for argument parsing, loads a user config, and dispatches to the resolver/matcher/executor pipeline. It also sets up shell completions via `omelette` and supports `--list`, `--dry-run`, `--init`, and the interactive TUI editor.

## Key concepts
- The core flow is: parse args, call `resolveAlias` to find the alias, call `findBestMatch` to pick the best rule, then call `execute` to run the resolved command.
- Aliases are context-dependent -- the same alias can map to different commands based on where you run it.
- Specificity scoring determines which rule wins when multiple rules match.
