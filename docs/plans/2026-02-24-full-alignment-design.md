# Full Alignment with run-tui

**Date:** 2026-02-24
**Status:** Approved

## Goal

Make run-ctx structurally consistent with run-tui so both projects share the same architectural patterns, file conventions, and developer experience.

## Already Done (Phase 1)

- TUI styling: `borderStyle="round"`, `dimColor`, `COLOR` constants, branded footer bar
- README: badges, Table of Contents, Available Scripts, Project Structure, Versioning sections

## Provider Architecture

### ConfigProvider

Owns the config lifecycle:

- `config: Config` -- the loaded config state
- `saveConfig(newConfig: Config): void` -- persists to disk and updates state
- Initialized from `loadConfig()` on mount

**Files:**
- `src/hooks/useConfig/index.ts` -- hook with state + persistence logic
- `src/providers/ConfigProvider/index.tsx` -- React Context wrapper
- `src/providers/ConfigProvider/ConfigProvider.types.ts` -- types

### NavigationProvider

Owns screen routing:

- `screen: Screen` -- current screen (discriminated union)
- `navigateTo(screen: Screen): void` -- navigate to any screen
- `goBack(): void` -- intelligent back navigation (detail -> editor -> list)

**Files:**
- `src/hooks/useNavigation/index.ts` -- hook with screen state + navigation logic
- `src/providers/NavigationProvider/index.tsx` -- React Context wrapper
- `src/providers/NavigationProvider/NavigationProvider.types.ts` -- types

### Composition

- `src/app/providers.tsx` -- composes `ConfigProvider > NavigationProvider > children`
- `src/app/index.tsx` -- exports App wrapped with providers (matches run-tui's pattern)
- `src/app/app.tsx` -- becomes thin render switch reading from providers

## Component File Convention

Each component gets `.types.ts` for Props and `.consts.ts` where there are meaningful constants.

| Component | `.types.ts` | `.consts.ts` |
|-----------|-------------|--------------|
| AliasList | `AliasListProps` | -- |
| RuleEditor | `RuleEditorProps` | -- |
| RuleDetail | `RuleDetailProps`, `Field` | `FIELDS` array |

## Package Scripts

Add missing scripts to match run-tui's developer experience:

- `dev:typescript` -- `tsgo --noEmit -p tsconfig.app.json --watch`
- `dev:test` -- `vitest --watch`
- `coverage` -- `vitest run --coverage`
- `coverage:unit` -- `vitest run -c vitest.unit.config.ts --coverage`
- `coverage:react` -- `vitest run -c vitest.react.config.ts --coverage`

## CHANGELOG

Reformat to Keep a Changelog standard with `### Added`, `### Changed`, `### Fixed` sections.

## e2e Test Scaffolding

- `e2e/utils/pty-runner.ts` -- PTY test runner modeled on run-tui
- `e2e/editor.e2e.ts` -- placeholder test for TUI editor
- `vitest.e2e.config.ts` already exists

## File Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| Providers | 4 | -- |
| Hooks | 2 | -- |
| App layer | 2 (providers.tsx, index.tsx) | 2 (app.tsx, editor-cli.tsx) |
| Component types/consts | 4 | -- |
| Config | -- | 2 (package.json, CHANGELOG.md) |
| e2e | 2-3 | -- |
