---
title: Command System
teleport:
  file: src/commands/index.ts
  line: 7
  highlight: PROJECT_COMMANDS
actions:
  - label: View command types
    command: cat src/commands/types.ts
validate:
  command: test -f src/commands/index.ts
  hint: Ensure you are in the run-ctx project root
required: false
---

# Command System

## How it works
Commands are defined as a typed array of `RunCtxCommand` objects passed to the toolkit's `createCommandsProvider`. Each command declares its key bindings, display text, help metadata, footer visibility, an `isEnabled` predicate, and an `execute` handler.

## Command categories
There are two categories: **active commands** like `QUIT`, `HELP`, and `BACK` that have real `execute` handlers, and **display-only commands** like `NAV_UP`, `SELECT`, and `NEW` whose `execute` is a no-op because the actual handling lives in the individual screen components.

## Key details
- The `isEnabled` predicate uses the `deps` object to check the current screen type and whether input fields are active, preventing key conflicts when the user is typing in a text input.
- Commands are registered once and the toolkit handles rendering them in the footer and dispatching keypress events.
