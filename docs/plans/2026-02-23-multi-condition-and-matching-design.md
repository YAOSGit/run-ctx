# Multi-Condition AND Matching

## Problem

`run-ctx` conditions (`file`, `cwd`, `env`) each accept a single string value. Users cannot require multiple files to be present simultaneously (e.g., both `package.json` and `pnpm-lock.yaml` for a pnpm-specific rule).

## Decision

- **Array = AND** — all items in the array must match. Each matched item scores +1.
- **No OR syntax** — separate rules already provide OR behavior.
- **TUI gets multi-entry editing** — add/remove values per condition field.
- **Fully backward-compatible** — single strings work identically to today.

## Type Change

```ts
// src/types/Rule/index.ts
export type MatchCondition = {
    file?: string | string[];
    cwd?: string | string[];
    env?: string | string[];
};
```

## Evaluator Logic

In `evaluateRule` for each condition (`file`, `cwd`, `env`):

- `string` → totalConditions +1, score +1 if matched (unchanged)
- `string[]` → totalConditions += N, score += matched count
- Rule matches only when `score === totalConditions`

### Scoring

```
Rule A: { file: "package.json" }                                 → score 1
Rule B: { file: ["package.json", "pnpm-lock.yaml"] }             → score 2
Rule C: { file: ["package.json", "pnpm-lock.yaml"], env: "CI" }  → score 3
```

More specific rules (more AND conditions) naturally win tie-breaks.

## TUI Editor

Each condition field becomes a navigable list:

```
> file (glob):
    1. package.json
    2. pnpm-lock.yaml
    [a] Add   [d] Delete   [Enter] Edit
  cwd (regex): (empty)
  env var: HOME
```

- Arrow keys navigate fields and entries
- `a` adds, `d` deletes, `Enter` edits inline
- Single-value fields display flat
- Empty arrays = condition not set

## Files to Change

| File | Change |
|------|--------|
| `src/types/Rule/index.ts` | Widen fields to `string \| string[]` |
| `src/utils/matcher/index.ts` | Handle arrays in `evaluateRule` |
| `src/utils/matcher/matcher.test.ts` | Add array AND tests |
| `src/components/RuleDetail/index.tsx` | Multi-entry list UI |

## Config Example

```json
{
  "aliases": {
    "dev": {
      "rules": [
        { "match": { "file": ["package.json", "pnpm-lock.yaml"] }, "command": "pnpm dev" },
        { "match": { "file": ["package.json", "yarn.lock"] }, "command": "yarn dev" },
        { "match": { "file": "package.json" }, "command": "npm run dev" },
        { "match": { "file": "Cargo.toml" }, "command": "cargo run" }
      ]
    }
  }
}
```

The pnpm rule (score 2) beats the generic npm rule (score 1) when both files exist.

---

## Feature 2: Dot-Notation Sub-Command Aliases

### Problem

Currently `run-ctx foo bar` looks up alias `"foo"` and passes `"bar"` as a passthrough arg. There's no way to define sub-commands where `run-ctx foo bar` and `run-ctx foo baz` resolve to different aliases.

### Decision

- **Dot-notation** — `foo.bar` and `foo.baz` are separate alias keys in the config.
- **Greedy resolution** — `run-ctx foo bar baz` tries `foo.bar.baz`, then `foo.bar`, then `foo`.
- **Fallback to parent** — if `foo.bar` doesn't exist but `foo` does, use `foo` with `bar` as passthrough.
- **Unlimited depth** — supports `foo.bar.baz.qux` etc.

### Resolution Algorithm

Given `run-ctx foo bar baz`:

1. Try `foo.bar.baz` → if found, passthrough = `[]`
2. Try `foo.bar` → if found, passthrough = `["baz"]`
3. Try `foo` → if found, passthrough = `["bar", "baz"]`
4. None found → error

### Config Example

```json
{
  "aliases": {
    "foo.bar.baz": {
      "rules": [{ "match": {}, "command": "echo most-specific" }]
    },
    "foo.bar": {
      "rules": [{ "match": { "file": "package.json" }, "command": "echo mid-level" }]
    },
    "foo": {
      "rules": [{ "match": {}, "command": "echo catch-all" }],
      "fallback": "echo no match"
    }
  }
}
```

### Files to Change

| File | Change |
|------|--------|
| `src/app/cli.ts` | Replace single-key lookup with greedy `resolveAlias` |

No changes to types, matcher, or TUI — purely a CLI resolution concern.
