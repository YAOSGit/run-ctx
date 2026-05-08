# Basic Example -- File-Presence Rules

This example demonstrates the simplest use of run-ctx: three aliases (`dev`, `build`, `test`) that automatically resolve to the correct command based on which project files exist in the current directory.

## What it does

The config defines three universal aliases that adapt to the project type:

| Alias   | package.json (Node)    | Cargo.toml (Rust)          | go.mod (Go)        |
|---------|------------------------|-----------------------------|---------------------|
| `dev`   | `npm run dev`          | `cargo watch -x run`        | `go run .`          |
| `build` | `npm run build`        | `cargo build --release`     | `go build ./...`    |
| `test`  | `npm test`             | `cargo test`                | `go test ./...`     |

Each alias includes a `fallback` command that runs when none of the rules match (i.e., the directory contains none of the recognized project files).

## How matching works

Each rule uses a `file` condition with a single glob pattern. run-ctx checks whether that file exists in the current working directory. The first matching rule wins.

For example, running `run-ctx dev` in a directory containing `package.json` will execute `npm run dev`.

## Setup

1. Copy the config to the run-ctx configuration directory:

   ```bash
   cp config.json ~/.config/run-ctx/config.json
   ```

2. Navigate into one of the sample project directories:

   ```bash
   cd node-project/
   # or
   cd rust-project/
   ```

3. Run any of the aliases:

   ```bash
   run-ctx dev
   run-ctx build
   run-ctx test
   ```

## Try it out

From `node-project/`:

```bash
$ run-ctx dev
# runs: npm run dev
# output: Node dev server running
```

From `rust-project/`:

```bash
$ run-ctx dev
# runs: cargo watch -x run
```

From a directory with no recognized project files:

```bash
$ run-ctx dev
# runs: echo 'No dev script found for this project'
```

## Sample projects included

- `node-project/` -- Contains a `package.json` with stub scripts for dev, build, and test.
- `rust-project/` -- Contains a minimal `Cargo.toml`.
