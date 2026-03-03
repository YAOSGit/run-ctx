# Integration Example -- Monorepo Multi-Tool Setup

This example demonstrates how run-ctx handles a monorepo with multiple packages, combining `cwd` regex matching, `env` variable checks, and `file` presence to deliver package-specific commands from a single global config.

## Monorepo structure

```
monorepo/
  Makefile
  packages/
    api/
      package.json
    web/
      package.json
```

The config defines aliases that resolve differently depending on which package directory you are currently in.

## Features demonstrated

### cwd regex matching

The `cwd` field matches against the full path of the current working directory using a regex pattern. This allows rules to target specific subdirectories in a monorepo.

```json
{
  "match": { "cwd": "packages/api", "file": "package.json" },
  "command": "npm run dev:api"
}
```

This rule matches when you are inside any directory whose path contains `packages/api` and that directory contains a `package.json`.

### CI vs. local environment differentiation

The `test` alias shows how to provide different behavior in CI versus local development:

```json
{
  "match": { "env": "CI", "file": "package.json" },
  "command": "npm run test:ci"
}
```

In CI (where the `CI` environment variable is set), tests run with coverage and without watch mode. Locally, tests run in watch mode with package-specific options (e.g., `--ui` for the web package).

### Deep specificity scoring

run-ctx scores rules by the total number of conditions. More conditions means higher priority:

| Conditions                  | Score | Example                          |
|-----------------------------|-------|----------------------------------|
| `cwd` + `file` + `env`     | 3     | CI tests in a specific package   |
| `cwd` + `file`             | 2     | Package-specific dev server      |
| `file` (array of 2)        | 2     | Biome linting (needs 2 files)    |
| `file` (single)            | 1     | Generic fallback                 |

This means `env: "CI"` + `file: "package.json"` (score 2) beats `file: "package.json"` alone (score 1), so CI always gets the CI-specific command regardless of rule order.

### Dot-notation aliases for database operations

Database commands are scoped to the `packages/api` directory using `cwd` matching:

- `db.migrate` -- Runs `npx drizzle-kit migrate` (only from packages/api)
- `db.seed` -- Runs `npx tsx scripts/seed.ts` (only from packages/api)

These commands simply do nothing (no match, no fallback) when invoked from outside the API package directory.

### Makefile fallback at the monorepo root

When you are at the monorepo root (which has a `Makefile` but no `package.json`), commands like `run-ctx dev` fall through to `make dev`. This provides a natural top-level entry point for the whole repo.

## Setup

1. Copy the config:

   ```bash
   cp config.json ~/.config/run-ctx/config.json
   ```

2. Navigate into the monorepo:

   ```bash
   cd monorepo/
   ```

## Usage examples

From the monorepo root:

```bash
$ run-ctx dev
# runs: make dev (Makefile is present)

$ run-ctx lint
# runs: make lint
```

From `packages/api/`:

```bash
$ cd packages/api/

$ run-ctx dev
# runs: npm run dev:api

$ run-ctx test
# runs: npm run test -- --watch

$ run-ctx db.migrate
# runs: npx drizzle-kit migrate
```

From `packages/web/`:

```bash
$ cd packages/web/

$ run-ctx dev
# runs: npm run dev:web

$ run-ctx test
# runs: npm run test -- --watch --ui
```

In CI (from any package directory with package.json):

```bash
$ CI=true run-ctx test
# runs: npm run test:ci
```
