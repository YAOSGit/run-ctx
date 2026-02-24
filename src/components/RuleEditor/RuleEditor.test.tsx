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
			/>,
		);
		expect(lastFrame()).toContain('package.json, pnpm-lock.yaml');
	});
});
