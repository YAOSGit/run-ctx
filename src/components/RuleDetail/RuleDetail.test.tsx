import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { Rule } from '../../types/Rule/index.js';
import RuleDetail from './index.js';

describe('RuleDetail', () => {
	const rule: Rule = {
		match: { file: 'package.json', env: 'NODE_ENV' },
		command: 'npm run dev',
	};

	it('renders the command', () => {
		const { lastFrame } = render(
			<RuleDetail rule={rule} onSave={vi.fn()} onBack={vi.fn()} />,
		);
		expect(lastFrame()).toContain('npm run dev');
	});

	it('renders match conditions as editable fields', () => {
		const { lastFrame } = render(
			<RuleDetail rule={rule} onSave={vi.fn()} onBack={vi.fn()} />,
		);
		expect(lastFrame()).toContain('file');
		expect(lastFrame()).toContain('package.json');
		expect(lastFrame()).toContain('env');
		expect(lastFrame()).toContain('NODE_ENV');
	});

	it('renders array match conditions as numbered list', () => {
		const arrayRule: Rule = {
			match: { file: ['package.json', 'pnpm-lock.yaml'] },
			command: 'pnpm dev',
		};
		const { lastFrame } = render(
			<RuleDetail rule={arrayRule} onSave={vi.fn()} onBack={vi.fn()} />,
		);
		expect(lastFrame()).toContain('1. package.json');
		expect(lastFrame()).toContain('2. pnpm-lock.yaml');
	});
});
