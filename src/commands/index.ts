import { createCommandsProvider } from '@yaos-git/toolkit/tui/commands';
import type { RunCtxCommand, RunCtxDeps } from './types.js';

const notInputting = (deps: RunCtxDeps) =>
	deps.ui.activeOverlay === 'none' && !deps.ui.inputActive;

const PROJECT_COMMANDS: RunCtxCommand[] = [
	{
		id: 'QUIT',
		keys: [{ textKey: 'q' }],
		displayKey: 'q',
		displayText: 'quit',
		helpSection: 'General',
		helpLabel: 'Exit run-ctx editor',
		footer: 'priority',
		footerOrder: 99,
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type === 'alias-list',
		execute: (deps) => deps.onQuit(),
	},
	// Override toolkit help: guard against inputActive
	{
		id: 'HELP',
		keys: [{ textKey: 'h' }],
		displayKey: 'h',
		displayText: 'help',
		helpSection: 'General',
		footer: 'priority',
		footerOrder: 98,
		isEnabled: (deps) => notInputting(deps),
		execute: (deps) => deps.ui.setActiveOverlay('help'),
	},
	// Back: escape from rule-editor or rule-detail
	{
		id: 'BACK',
		keys: [{ specialKey: 'escape' }],
		displayKey: 'Esc',
		displayText: 'back',
		helpSection: 'Navigation',
		helpLabel: 'Return to previous screen',
		footer: 'optional',
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type !== 'alias-list',
		execute: (deps) => deps.goBack(),
	},

	// ── Navigation (display-only, all screens) ───────────────────────
	{
		id: 'NAV_UP',
		keys: [{ specialKey: 'up' }],
		displayKey: '\u2191 / \u2193',
		displayText: 'move',
		helpSection: 'Navigation',
		footer: 'priority',
		footerOrder: 1,
		isEnabled: (deps) => notInputting(deps),
		execute: () => {},
	},
	{
		id: 'NAV_DOWN',
		keys: [{ specialKey: 'down' }],
		displayKey: '\u2193',
		displayText: 'down',
		helpSection: 'Navigation',
		footer: 'hidden',
		isEnabled: (deps) => notInputting(deps),
		execute: () => {},
	},
	{
		id: 'SELECT',
		keys: [{ specialKey: 'return' }],
		displayKey: 'Enter',
		displayText: 'open',
		helpSection: 'Navigation',
		footer: 'priority',
		footerOrder: 2,
		isEnabled: (deps) => notInputting(deps),
		execute: () => {},
	},

	// ── AliasList screen ──────────────────────────────────────────────
	{
		id: 'NEW',
		keys: [{ textKey: 'n' }],
		displayKey: 'n',
		displayText: 'new',
		helpSection: 'General',
		helpLabel: 'Create a new alias',
		footer: 'optional',
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type === 'alias-list',
		execute: () => {},
	},
	{
		id: 'DELETE',
		keys: [{ textKey: 'd' }],
		displayKey: 'd',
		displayText: 'delete',
		helpSection: 'General',
		helpLabel: 'Delete selected item',
		footer: 'optional',
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type === 'alias-list',
		execute: () => {},
	},
	{
		id: 'SEARCH',
		keys: [{ textKey: '/' }],
		displayKey: '/',
		displayText: 'search',
		helpSection: 'General',
		helpLabel: 'Search aliases',
		footer: 'optional',
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type === 'alias-list',
		execute: () => {},
	},

	// ── RuleEditor screen ─────────────────────────────────────────────
	{
		id: 'NEW_RULE',
		keys: [{ textKey: 'n' }],
		displayKey: 'n',
		displayText: 'new rule',
		helpSection: 'General',
		helpLabel: 'Add a new rule',
		footer: 'optional',
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type === 'rule-editor',
		execute: () => {},
	},
	{
		id: 'DELETE_RULE',
		keys: [{ textKey: 'd' }],
		displayKey: 'd',
		displayText: 'delete',
		helpSection: 'General',
		helpLabel: 'Delete selected rule',
		footer: 'optional',
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type === 'rule-editor',
		execute: () => {},
	},
	{
		id: 'REORDER_RULE',
		keys: [{ textKey: 'j' }],
		displayKey: 'j / k',
		displayText: 'reorder',
		helpSection: 'Navigation',
		helpLabel: 'Move rule down (j) or up (k)',
		footer: 'priority',
		footerOrder: 3,
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type === 'rule-editor',
		execute: () => {},
	},

	// ── RuleDetail screen ─────────────────────────────────────────────
	{
		id: 'ADD_ENTRY',
		keys: [{ textKey: 'a' }],
		displayKey: 'a',
		displayText: 'add',
		helpSection: 'General',
		helpLabel: 'Add a condition entry',
		footer: 'optional',
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type === 'rule-detail',
		execute: () => {},
	},
	{
		id: 'DELETE_ENTRY',
		keys: [{ textKey: 'd' }],
		displayKey: 'd',
		displayText: 'delete',
		helpSection: 'General',
		helpLabel: 'Delete selected entry',
		footer: 'optional',
		isEnabled: (deps) =>
			notInputting(deps) && deps.screen.type === 'rule-detail',
		execute: () => {},
	},
];

const { CommandsProvider, useCommands, COMMANDS } =
	createCommandsProvider<RunCtxDeps>(PROJECT_COMMANDS);

export type { RunCtxCommand, RunCtxDeps };
export { COMMANDS, CommandsProvider, useCommands };
