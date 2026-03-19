# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [126.1.0] - 2026-03-19

### Added

- Breadcrumb header showing navigation context (Aliases / Rules / Rule #N)
- Full command system: all keyboard shortcuts registered as commands (navigate, new, delete, search, reorder)
- Help override with `inputActive` guard — typing 'h' during text input no longer opens help
- Confirmation dialogs via toolkit's `requestConfirmation` for all delete operations
- `j/k` vim-style reorder for rules
- Quit confirmation dialog

### Changed

- Replaced custom StatusBar with toolkit CommandFooter — single footer, no duplication
- Selection indicator changed from `>` to `▸` (suite-wide consistency)
- Selection color uses `theme.brand` instead of hardcoded `COLOR.CYAN`
- All text input modes set `inputActive` to prevent command interference
- All `useInput` handlers guard against `ui.confirmation` to prevent `n` cancel from triggering commands
- Inline `[a]dd [d]elete` hints removed from RuleDetail fields — commands handle footer display
- RuleDetail "add entry" no longer saves empty string immediately — stays local until Enter confirms
- Separators added between Description/Rules/Fallback in RuleEditor and between command/conditions in RuleDetail
- Removed `→` arrow prefix from rule command display

### Removed

- Custom `StatusBar` component (replaced by CommandFooter)

## [126.0.4] - 2026-03-06

### Changed

- Updated dependencies

## [126.0.0] - 2026-02-24

### Changed

- TUI styling: round borders, branded footer bar, centralized COLOR constants
- README: badges, Table of Contents, Available Scripts, Project Structure, Versioning
- Architecture: ConfigProvider/NavigationProvider pattern matching run-tui
- Component file convention: .types.ts and .consts.ts files

## [125.0.0] - 2026-02-23

### Added

- Context-aware command aliasing based on cwd, file presence, and environment variables
- CSS-style specificity scoring for rule matching
- Interactive TUI editor (`run-ctx-editor`) for managing aliases and rules
- Support for `--list`, `--dry-run`, `--edit` flags
- Global config at `~/.config/run-ctx/config.json`
- Multi-condition AND matching (file + cwd + env)
- Dot-notation sub-aliases (e.g. `rc dev.frontend`)
- Editable alias name and description in TUI editor
