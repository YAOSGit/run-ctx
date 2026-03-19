---
title: Condition Matcher
teleport:
  file: src/utils/matcher/index.ts
  line: 126
  highlight: findBestMatch
actions:
  - label: Run tests
    command: npx vitest run src/utils/matcher/matcher.test.ts
validate:
  command: npx vitest run src/utils/matcher/matcher.test.ts --reporter=silent 2>&1 | grep -q "pass"
  hint: Matcher tests should pass before moving on
required: true
---

# Condition Matcher

## How it works
The matcher evaluates each rule's conditions against the current context using a CSS-like specificity scoring system. The score is a 3-tuple `[env, cwd, file]` where each dimension counts how many conditions of that type matched.

## Key functions
- `evaluateRule` (line 24) checks three condition types: `file` patterns are matched with picomatch against the current directory listing, `cwd` patterns use RE2 regex against the working directory path, and `env` conditions check for the presence of environment variables.
- `findBestMatch` iterates all rules, keeps the highest-scoring match, and uses last-wins on ties (like CSS cascade order). The optional `verbose` flag logs detailed evaluation results to stderr for debugging.
