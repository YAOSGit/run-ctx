import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { Alias } from '../../types/Alias/index.js';
import RuleEditor from './index.js';

describe('RuleEditor', () => {
	const alias: Alias = {
		description: 'Start dev server',
		rules: [
			{ match: { file: 'package.json' }, command: 'npm run dev' },
			{ match: { file: 'composer.json' }, command: 'composer serve' },
		],
	};

	it('renders the alias name as header', () => {
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('dev');
	});

	it('renders all rules with their commands', () => {
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('npm run dev');
		expect(lastFrame()).toContain('composer serve');
	});

	it('shows match conditions for each rule', () => {
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('package.json');
		expect(lastFrame()).toContain('composer.json');
	});

	it('renders fallback command when present', () => {
		const aliasWithFallback: Alias = {
			...alias,
			fallback: 'echo no match',
		};
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={aliasWithFallback}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('Fallback');
		expect(lastFrame()).toContain('echo no match');
	});

	it('renders (none) when no fallback is set', () => {
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('Fallback');
		expect(lastFrame()).toContain('(none)');
	});

	it('renders array match conditions correctly', () => {
		const aliasWithArrays: Alias = {
			rules: [
				{
					match: { file: ['package.json', 'pnpm-lock.yaml'] },
					command: 'pnpm dev',
				},
			],
		};
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={aliasWithArrays}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('package.json, pnpm-lock.yaml');
	});

	it('calls onRename when alias name is edited', async () => {
		const delay = () => new Promise((r) => setTimeout(r, 50));
		const onRename = vi.fn();
		const { stdin } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={onRename}
			/>,
		);
		await delay();
		// Name is selected by default (index 0), press Enter to edit
		stdin.write('\r');
		await delay();
		// Type new name
		stdin.write('start');
		await delay();
		// Press Enter to confirm
		stdin.write('\r');
		await delay();
		expect(onRename).toHaveBeenCalledWith('dev', 'start');
	});

	it('calls onSave with updated description when description is edited', async () => {
		const delay = () => new Promise((r) => setTimeout(r, 50));
		const onSave = vi.fn();
		const { stdin } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={onSave}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={vi.fn()}
			/>,
		);
		await delay();
		// Navigate down to Description (index 1)
		stdin.write('\u001B[B');
		await delay();
		// Press Enter to edit
		stdin.write('\r');
		await delay();
		// Clear existing text ("Start dev server" = 16 chars)
		for (let i = 0; i < 16; i++) stdin.write('\u007F');
		await delay();
		stdin.write('Run development mode');
		await delay();
		// Confirm
		stdin.write('\r');
		await delay();
		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({ description: 'Run development mode' }),
		);
	});

	it('shows usage preview with dot notation expanded to spaces', () => {
		const dotAlias: Alias = { rules: [], description: 'Nested command' };
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev.server"
				alias={dotAlias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('rc dev server [args...]');
	});

	it('shows usage preview for simple alias name', () => {
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
				onRename={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('rc dev [args...]');
	});
});
