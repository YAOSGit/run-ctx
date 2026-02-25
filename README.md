<h1 align="center">Yet another Open Source run-ctx</h1>

<p align="center">
  <strong>Context-aware command aliasing for your terminal — run the right command based on cwd, files, and env vars</strong>
</p>

<div align="center">

![Node Version](https://img.shields.io/badge/NODE-18+-16161D?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=%235FA04E)
![TypeScript Version](https://img.shields.io/badge/TYPESCRIPT-5.9-16161D?style=for-the-badge&logo=typescript&logoColor=white&labelColor=%233178C6)
![React Version](https://img.shields.io/badge/REACT-19.2-16161D?style=for-the-badge&logo=react&logoColor=black&labelColor=%2361DAFB)

![Uses Ink](https://img.shields.io/badge/INK-16161D?style=for-the-badge&logo=react&logoColor=white&labelColor=%2361DAFB)
![Uses Vitest](https://img.shields.io/badge/VITEST-16161D?style=for-the-badge&logo=vitest&logoColor=white&labelColor=%236E9F18)
![Uses Biome](https://img.shields.io/badge/BIOME-16161D?style=for-the-badge&logo=biome&logoColor=white&labelColor=%2360A5FA)

</div>

---

## Table of Contents

### Getting Started

- [Overview](#overview)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [CLI Usage](#cli-usage)

### Configuration

- [Config Format](#config-format)
- [Match Conditions](#match-conditions)
- [Specificity Scoring](#specificity-scoring)
- [Config Example](#config-example)

### TUI Editor

- [TUI Editor](#tui-editor)

### Development

- [Available Scripts](#available-scripts)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)

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

### What Makes This Project Unique

- **Context-Aware**: Automatically detects project type via files, cwd, and env vars
- **Specificity Scoring**: Multi-condition rules with CSS-style cascade resolution
- **TUI Editor**: Interactive terminal UI for managing aliases and rules
- **Zero Config Per-Project**: One global config works across all your projects

---

## Installation

```bash
# Install globally from npm
npm install -g run-ctx

# Or install as a dev dependency
npm install -D run-ctx
```

### From Source

```bash
# Clone the repository
git clone https://github.com/YAOSGit/run-ctx.git
cd run-ctx

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link
```

---

## Quick Start

1. Generate a starter configuration file automatically:

```bash
run-ctx --init
```

> **Note:** This automatically creates `~/.config/run-ctx/config.json` populated with common smart aliases like `dev`, `build`, `test`, `lint`, and `start` configured for popular languages and frameworks.

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
  "version": 2,
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
          "command": "<shell command to run>",
          "shell": false
        }
      ],
      "fallback": "<optional command when no rules match>",
      "shell": false
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
run-ctx --completions <shell>   Generate shell completion script (bash, zsh, fish)
run-ctx --shell                 Run command in shell (allows pipe, redirect, &&)
run-ctx --verbose, -V           Show detailed rule evaluation logs
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

# Configure bash tab-completion for rc/run-ctx
eval "$(rc --completions bash)"
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

## Available Scripts

### Development Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run tests in watch mode |
| `npm run dev:typescript` | Run TypeScript type checking in watch mode |

### Build Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Bundle the CLI with esbuild |

### Lint Scripts

| Script | Description |
|--------|-------------|
| `npm run lint` | Run type checking, linting, formatting, and audit |
| `npm run lint:check` | Check code for linting issues with Biome |
| `npm run lint:fix` | Check and fix linting issues with Biome |
| `npm run lint:format` | Format all files with Biome |
| `npm run lint:types` | Run TypeScript type checking only |
| `npm run lint:audit` | Run npm audit |

### Testing Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run all tests (unit, react) |
| `npm run test:unit` | Run unit tests |
| `npm run test:react` | Run React component tests |

---

## Tech Stack

### Core

- **[React 19](https://react.dev/)** - UI component library
- **[Ink 6](https://github.com/vadimdemedes/ink)** - React for CLIs
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[picomatch](https://github.com/micromatch/picomatch)** - Blazing fast glob matching
- **[re2](https://github.com/uhop/node-re2)** - Linear-time regex engine (ReDoS protected)
- **[omelette](https://github.com/fcan/omelette)** - Shell tab-completion engine

### Build & Development

- **[esbuild](https://esbuild.github.io/)** - Fast bundler
- **[Vitest](https://vitest.dev/)** - Unit testing framework
- **[Biome](https://biomejs.dev/)** - Linter and formatter

### UI Components

- **[@inkjs/ui](https://github.com/vadimdemedes/ink-ui)** - Ink UI components
- **[Chalk](https://github.com/chalk/chalk)** - Terminal string styling

---

## Project Structure

```
run-ctx/
├── src/
│   ├── app/                    # Application entry points
│   │   ├── cli.ts              # CLI entry point
│   │   ├── editor-cli.tsx      # TUI editor entry point
│   │   └── app.tsx             # Main application component
│   ├── components/             # React components
│   │   ├── AliasList/          # Home screen - list all aliases
│   │   ├── RuleEditor/         # Edit rules for an alias
│   │   └── RuleDetail/         # Edit individual rule fields
│   ├── types/                  # TypeScript type definitions
│   │   ├── Alias/              # Alias type definitions
│   │   ├── Color/              # Color constants and types
│   │   ├── Config/             # Config type definitions
│   │   └── Rule/               # Rule type definitions
│   └── utils/                  # Utility functions
│       ├── config/             # Load/save config from ~/.config/run-ctx
│       ├── executor/           # Execute resolved commands
│       ├── matcher/            # Match rules based on conditions
│       └── resolver/           # Resolve alias to command
├── docs/                       # Documentation and plans
├── dist/                       # Built output
├── biome.json                  # Biome configuration
├── tsconfig.json               # TypeScript configuration
├── tsconfig.app.json           # App TypeScript configuration
├── vitest.unit.config.ts       # Unit test configuration
├── vitest.react.config.ts      # React test configuration
├── esbuild.config.js           # esbuild bundler configuration
└── package.json
```

---

## Versioning

This project uses a custom versioning scheme: `MAJORYY.MINOR.PATCH`

| Part | Description | Example |
|------|-------------|---------|
| `MAJOR` | Major version number | `1` |
| `YY` | Year (last 2 digits) | `26` for 2026 |
| `MINOR` | Minor version | `0` |
| `PATCH` | Patch version | `0` |

**Example:** `126.0.0` = Major version 1, released in 2026, minor 0, patch 0

This format allows you to quickly identify both the major version and the year of release at a glance.

---

## License

ISC
