# Custom Example -- Array Conditions, Env Vars, and Dot-Notation Aliases

This example demonstrates more advanced run-ctx features: matching on multiple files simultaneously, requiring environment variables, and organizing related aliases with dot-notation naming.

## Features demonstrated

### Array file conditions

When `file` is an array, **all** listed files must exist in the current directory for the rule to match. This lets you distinguish between different tools that share a common file.

```json
{
  "match": { "file": ["package.json", "next.config.js"] },
  "command": "next dev"
}
```

This rule only matches if **both** `package.json` and `next.config.js` are present, distinguishing a Next.js project from a plain Node project.

### Environment variable matching

The `env` field requires that specific environment variables are set (non-empty) for the rule to match. This is useful for CI/CD pipelines or environment-specific behavior.

```json
{
  "match": { "env": "CI", "file": "Dockerfile" },
  "command": "docker build -t app . && docker push app"
}
```

This rule only matches in CI environments where the `CI` variable is set. Locally, it falls through to the next rule that only builds without pushing.

### Dot-notation aliases

Aliases can use dots to create logical groupings:

- `docker.up` -- Start Docker services
- `docker.down` -- Stop Docker services
- `docker.logs` -- View Docker logs

These are simply alias names with dots in them; there is no special namespace behavior. They are invoked the same way as any other alias:

```bash
run-ctx docker.up
run-ctx docker.logs
```

### Specificity scoring

When multiple rules could match, run-ctx prefers the rule with the most conditions. A rule matching on `file` + `env` scores higher than a rule matching on `file` alone. This means you can safely place general rules after specific ones -- the most specific match always wins regardless of order.

In the `dev` alias:

1. `file` (2 items) + `env` (1 item) = 3 conditions -- highest priority
2. `file` (2 items) = 2 conditions -- medium priority
3. `file` (1 item) = 1 condition -- lowest priority, catches remaining Node projects

## Setup

1. Copy the config:

   ```bash
   cp config.json ~/.config/run-ctx/config.json
   ```

2. Run aliases from any project directory:

   ```bash
   run-ctx dev
   run-ctx deploy
   run-ctx docker.up
   ```

## Usage examples

In a Next.js project (has `package.json` + `next.config.js`) with `NODE_ENV` set:

```bash
$ NODE_ENV=development run-ctx dev
# runs: next dev
```

In a Vite project (has `package.json` + `vite.config.ts`):

```bash
$ run-ctx dev
# runs: vite dev
```

In a plain Node project (has only `package.json`):

```bash
$ run-ctx dev
# runs: npm run dev
```

Deploying locally vs. in CI:

```bash
# Locally (no CI env var):
$ run-ctx deploy
# runs: docker build -t app:local .

# In CI:
$ CI=true run-ctx deploy
# runs: docker build -t app . && docker push app
```

Managing Docker services:

```bash
$ run-ctx docker.up     # docker compose up -d
$ run-ctx docker.logs   # docker compose logs -f
$ run-ctx docker.down   # docker compose down
```
