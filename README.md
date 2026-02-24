<h1 align="center">run-ctx</h1>

<p align="center">
  <strong>Context-aware command aliasing for your terminal</strong>
</p>

<div align="center">

![Node Version](https://img.shields.io/badge/NODE-18+-16161D?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=%235FA04E)
![TypeScript Version](https://img.shields.io/badge/TYPESCRIPT-5.9-16161D?style=for-the-badge&logo=typescript&logoColor=white&labelColor=%233178C6)

</div>

---

## Overview

**run-ctx** is a globally-installed CLI that aliases commands based on context -- your current working directory, the files present, and environment variables.

Define a single alias like `dev`, and run-ctx resolves it to the right command for whatever project you are in:

```bash
# In a Node project (has package.json):
run-ctx dev  # --> npm run dev

# In a PHP project (has composer.json):
run-ctx dev  # --> composer serve

# In a Rust project (has Cargo.toml):
run-ctx dev  # --> cargo watch -x run
```

No more remembering which command goes with which project.

---

## Installation

```bash
npm install -g run-ctx
```

---

## Quick Start

1. Create the config directory and file:

```bash
mkdir -p ~/.config/run-ctx
```

1. Add your first alias to `~/.config/run-ctx/config.json`:

```json
{
  "aliases": {
    "dev": {
      "description": "Start dev server",
      "rules": [
        {
          "match": { "file": "package.json" },
          "command": "npm run dev"
        }
      ]
    }
  }
}
```

1. Run it:

```bash
cd ~/my-node-project
run-ctx dev
# Executes: npm run dev
```

---

## Config Format

The config file lives at `~/.config/run-ctx/config.json` (or `$XDG_CONFIG_HOME/run-ctx/config.json` if set).

### Schema

```json
{
  "aliases": {
    "<alias-name>": {
      "description": "Optional human-readable description",
      "rules": [
        {
          "match": {
            "file": "<glob pattern>",
            "cwd": "<regex pattern>",
            "env": "<VAR_NAME>"
          },
          "command": "<shell command to run>"
        }
      ],
      "fallback": "<optional command when no rules match>"
    }
  }
}
```

### Example

```json
{
  "aliases": {
    "dev": {
      "description": "Start development server",
      "rules": [
        {
          "match": { "file": "package.json", "cwd": "frontend" },
          "command": "npm run dev"
        },
        {
          "match": { "file": "composer.json" },
          "command": "composer serve"
        }
      ],
      "fallback": "echo 'No dev server configured for this project'"
    }
  }
}
```

---

## Match Conditions

Each rule has a `match` object with one or more conditions. All specified conditions must be satisfied for the rule to match.

| Condition | Type     | What it checks                                        | Example                    |
|-----------|----------|-------------------------------------------------------|----------------------------|
| `file`    | Glob     | Whether a file matching the pattern exists in cwd     | `"package.json"`, `"*.go"` |
| `cwd`     | Regex    | Whether the current directory path matches            | `"frontend"`, `"/api$"`    |
| `env`     | Var name | Whether the environment variable is set and non-empty | `"CI"`, `"DOCKER"`         |

---

## Specificity Scoring

Each condition in a rule that is defined and satisfied scores **1 point**. The rule with the highest total score wins.

- A rule with `file` + `cwd` + `env` all matching scores **3**.
- A rule with only `file` matching scores **1**.
- When two rules have the same score, the **later rule** in the array wins (CSS-style cascade).
- If no rules match and a `fallback` is defined, the fallback command runs.

---

## CLI Usage

```text
run-ctx <alias> [args...]       Run alias, pass through additional args
run-ctx --list, -l              Show all aliases and matched commands for current context
run-ctx --dry-run <alias>       Show what command would run without executing
run-ctx --edit, -e              Launch the TUI editor (run-ctx-editor)
run-ctx --help, -h              Show help message
run-ctx --version, -v           Show version information
```

### Examples

```bash
# Run the "test" alias with extra args
run-ctx test --coverage

# See what every alias resolves to in the current directory
run-ctx --list

# Preview the resolved command without executing
run-ctx --dry-run build

# Open the interactive config editor
run-ctx --edit
```

---

## TUI Editor

Launch with `run-ctx-editor` or `run-ctx --edit`. The editor provides three screens for managing your config interactively.

### AliasList (home screen)

| Key       | Action                |
|-----------|-----------------------|
| Up / Down | Navigate aliases      |
| Enter     | Edit selected alias   |
| `n`       | Create new alias      |
| `d`       | Delete selected alias |
| `q` / Esc | Quit editor           |

### RuleEditor (alias detail)

| Key       | Action               |
|-----------|----------------------|
| Up / Down | Navigate rules       |
| Enter     | Edit selected rule   |
| `n`       | Add new rule         |
| `d`       | Delete selected rule |
| `j`       | Move rule down       |
| `J`       | Move rule up         |
| `q` / Esc | Back to alias list   |

### RuleDetail (rule fields)

| Key       | Action                                    |
|-----------|-------------------------------------------|
| Up / Down | Navigate fields (command, file, cwd, env) |
| Enter     | Edit field value                          |
| Esc       | Save and go back                          |

---

## Config Example

A realistic config for a polyglot developer:

```json
{
  "aliases": {
    "dev": {
      "description": "Start development server",
      "rules": [
        { "match": { "file": "package.json" }, "command": "npm run dev" },
        { "match": { "file": "composer.json" }, "command": "php artisan serve" },
        { "match": { "file": "Cargo.toml" }, "command": "cargo watch -x run" },
        { "match": { "file": "go.mod" }, "command": "go run ." }
      ]
    },
    "test": {
      "description": "Run tests",
      "rules": [
        { "match": { "file": "package.json" }, "command": "npm test" },
        { "match": { "file": "composer.json" }, "command": "php artisan test" },
        { "match": { "file": "Cargo.toml" }, "command": "cargo test" },
        { "match": { "file": "go.mod" }, "command": "go test ./..." }
      ]
    },
    "build": {
      "description": "Build project",
      "rules": [
        { "match": { "file": "package.json" }, "command": "npm run build" },
        { "match": { "file": "Cargo.toml" }, "command": "cargo build --release" },
        { "match": { "file": "go.mod" }, "command": "go build -o bin/app ." }
      ],
      "fallback": "echo 'No build configured'"
    },
    "lint": {
      "description": "Lint code",
      "rules": [
        { "match": { "file": "biome.json" }, "command": "npx biome check ." },
        { "match": { "file": ".eslintrc*" }, "command": "npx eslint ." },
        { "match": { "file": "Cargo.toml" }, "command": "cargo clippy" },
        { "match": { "file": "go.mod" }, "command": "golangci-lint run" }
      ]
    },
    "deploy": {
      "description": "Deploy (CI only)",
      "rules": [
        {
          "match": { "file": "package.json", "env": "CI" },
          "command": "npm run deploy"
        }
      ]
    }
  }
}
```

---

## Tech Stack

- **[TypeScript](https://www.typescriptlang.org/)** -- Type-safe implementation
- **[Ink](https://github.com/vadimdemedes/ink)** -- React for terminal UIs (TUI editor)
- **[Commander](https://github.com/tj/commander.js)** -- CLI argument parsing
- **[esbuild](https://esbuild.github.io/)** -- Fast bundler

---

## License

ISC
