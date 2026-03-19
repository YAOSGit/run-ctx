---
title: Try It Out
teleport:
  file: src/app/cli.ts
  line: 57
  highlight: createCLI
actions:
  - label: Run help
    command: node dist/cli.js --help
  - label: List aliases
    command: node dist/cli.js --list
validate:
  command: node dist/cli.js --help 2>&1 | grep -q "run-ctx"
  hint: Build the project first with npm run build, then try again
required: false
---

# Try It Out

## What to do
Run the CLI with `--help` to see all available options and aliases. Use the "Run help" action above to see the full help output. Then try `--list` to see how each alias resolves in your current context.

## What to expect
The help text is dynamically augmented with any aliases found in the loaded config file. The `--list` output shows the winning command and its specificity score for each alias.

If no config exists yet, use `node dist/cli.js --init` to bootstrap a starter configuration with example aliases.
