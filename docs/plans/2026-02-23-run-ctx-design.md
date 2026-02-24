# run-ctx: Context-Aware Command Alias Tool

## Overview

`run-ctx` is a globally installed npm CLI that maps alias names to commands based on the current working context. Running `run-ctx dev` executes `npm run dev` in a Node project, `composer serve` in a PHP project, or any other command — determined by rules that inspect the cwd, files present, and environment variables.

## Binaries

The package exposes two binaries:

- **`run-ctx <alias> [args...]`** — Lean runner. No Ink/React at runtime.
- **`run-ctx-editor`** — Ink TUI for CRUD management of rules.

`run-ctx --edit` is a convenience shortcut that launches `run-ctx-editor`.

## CLI Behavior

### Alias-first resolution

1. If a positional arg is given → always treated as an alias. Everything after is passthrough to the matched command.
2. If no positional arg → process flags: `--edit`, `--list`, `--dry-run <alias>`, `--help`, `--version`.

### Examples

```bash
run-ctx dev              # Runs the command matched by alias "dev"
run-ctx dev --port 3000  # Passthrough: "npm run dev --port 3000"
run-ctx --list           # Show all aliases + what would match in current context
run-ctx --dry-run dev    # Show matched command without executing
run-ctx --edit           # Launch TUI editor
run-ctx --help           # Help text
```

## Config

**Location:** `~/.config/run-ctx/config.json`

### Schema

```json
{
  "aliases": {
    "dev": {
      "description": "Start development server",
      "rules": [
        {
          "match": { "file": "package.json" },
          "command": "npm run dev"
        },
        {
          "match": { "file": "composer.json" },
          "command": "composer serve"
        },
        {
          "match": { "cwd": "/home/user/projects/go-.*", "env": "GOPATH" },
          "command": "go run ."
        }
      ],
      "fallback": null
    }
  }
}
```

### Match Conditions

| Condition | Type  | Description |
|-----------|-------|-------------|
| `file`    | Glob  | Glob pattern checked in cwd (e.g. `"package.json"`, `"*.sln"`) |
| `cwd`     | Regex | Regex matched against full cwd path (e.g. `"/projects/go-.*"`) |
| `env`     | Name  | Environment variable name that must be set and non-empty |

### Specificity Scoring

All condition types are worth **1 point each**. A rule's specificity = number of conditions it has.

- 1 condition = 1 point
- 2 conditions = 2 points
- 3 conditions = 3 points

**Tie-breaking:** If two rules have the same score, the **later rule** in the array wins (CSS-style).

If no rule matches and no `fallback` is set, print an error with context about what was checked.

## Runner Flow

```
run-ctx dev --port 3000
        │       │
        ▼       ▼
    alias    passthrough args
        │
        ▼
  Load ~/.config/run-ctx/config.json
        │
        ▼
  Find alias "dev" → get rules[]
        │
        ▼
  Evaluate each rule against current context:
    - cwd: process.cwd() matched against rule.match.cwd regex
    - file: glob check for rule.match.file in cwd
    - env: process.env[rule.match.env] is truthy
        │
        ▼
  Score rules (1 point per matching condition)
  Pick highest score; ties → last rule wins
        │
        ▼
  Spawn command with args appended:
    "npm run dev --port 3000"
    (stdio: 'inherit' — child owns terminal)
```

## TUI Editor (`run-ctx-editor`)

Ink-based CRUD interface with these views:

1. **Alias List** — All aliases. `n` to create, `d` to delete, `Enter` to edit.
2. **Rule Editor** — For a selected alias: list rules, reorder, add/edit/delete.
3. **Rule Detail** — Edit match conditions (file/cwd/env) and command string.

Reads and writes `~/.config/run-ctx/config.json` directly.

## Project Structure

Preserves the existing folder convention (app/, components/, hooks/, providers/, types/, utils/).

```
run-ctx/
├── src/
│   ├── app/
│   │   ├── cli.ts               # Runner entry point (run-ctx)
│   │   ├── editor-cli.tsx       # Editor entry point (run-ctx-editor)
│   │   ├── app.tsx              # Main Ink editor app
│   │   └── providers.tsx        # Context providers for editor
│   ├── components/              # Ink components (editor TUI)
│   │   ├── AliasList/           # Alias list view
│   │   ├── RuleEditor/          # Rule editor view
│   │   └── RuleDetail/          # Rule detail/form view
│   ├── hooks/                   # Custom React hooks (editor)
│   ├── providers/               # React context providers (editor)
│   ├── commands/                # Keyboard command handlers (editor)
│   ├── types/                   # TypeScript type definitions
│   │   ├── Config/              # Config schema types
│   │   ├── Rule/                # Rule + match types
│   │   └── Alias/               # Alias types
│   └── utils/                   # Shared utilities
│       ├── config/              # Config read/write/validate
│       ├── matcher/             # Rule evaluation + specificity scoring
│       └── executor/            # Spawn matched command
├── esbuild.config.js            # Builds both binaries
├── package.json
└── ...
```

## Tech Stack

- **TypeScript** — Type safety
- **esbuild** — Bundling both binaries
- **Commander** — CLI arg parsing for runner
- **Ink + React** — TUI editor only
- **Vitest** — Testing
- **Biome** — Linting/formatting

## What Gets Removed

All existing run-tui application code (components, commands, hooks, providers, types, tests, e2e). Kept: build toolchain, project scaffolding, config files.
