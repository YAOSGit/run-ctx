# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

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
