---
title: Alias Resolver
teleport:
  file: src/utils/resolver/index.ts
  line: 9
  highlight: resolveAlias
actions:
  - label: Run tests
    command: npx vitest run src/utils/resolver/resolver.test.ts
validate:
  command: npx vitest run src/utils/resolver/resolver.test.ts --reporter=silent 2>&1 | grep -q "pass"
  hint: Resolver tests should pass before moving on
required: true
---

# Alias Resolver

## How it works
The `resolveAlias` function takes a flat map of aliases and the CLI args, then uses a greedy longest-match strategy to find the best alias. It joins args with dots and tries the longest key first (e.g., `build.prod`), then shrinks to shorter candidates (e.g., `build`).

## Key details
- The `--` separator splits passthrough arguments from the alias name. Any args after the matched alias (and after `--` if present) are forwarded as passthrough to the resolved command.
- The return type is either a `ResolveResult` containing the alias, its canonical name, and passthrough args, or `null` if no alias matched.
- The greedy approach means more specific multi-segment aliases always take priority over shorter ones.
