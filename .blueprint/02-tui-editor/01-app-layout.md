---
title: App Layout
teleport:
  file: src/app/app.tsx
  line: 52
  highlight: AppContent
actions:
  - label: View providers
    command: cat src/app/providers.tsx
validate:
  command: test -f src/app/app.tsx
  hint: Ensure you are in the run-ctx project root
required: true
---

# App Layout

## How it works
`AppContent` is the root component of the TUI editor. It follows the toolkit's `TUILayout` + `BreadcrumbHeader` + `CommandFooter` pattern that is shared across YAOS-git TUI apps. The `BreadcrumbHeader` (line 19) renders a navigational breadcrumb trail that updates based on the current screen: alias list, rule editor, or rule detail.

## Component structure
- The `TUILayout` component (line 158) wraps everything with the shared shell that provides a branded border, help overlay, and command footer.
- Screen routing is handled by a `switch` on `screen.type`. Each screen renders a dedicated component (`AliasList`, `RuleEditor`, `RuleDetail`).
- The navigation guard on line 65 ensures stale screen references fall back gracefully.
