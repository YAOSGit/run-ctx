import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { Config } from '../../types/Config/index.js';
import AliasList from './index.js';

describe('AliasList', () => {
	const baseConfig: Config = {
		aliases: {
			dev: {
				description: 'Start dev server',
				rules: [{ match: { file: 'package.json' }, command: 'npm run dev' }],
			},
			test: {
				rules: [{ match: { file: 'package.json' }, command: 'npm test' }],
			},
		},
	};

	it('renders alias names', () => {
		const { lastFrame } = render(
			<AliasList config={baseConfig} onSave={vi.fn()} onEditAlias={vi.fn()} />,
		);
		expect(lastFrame()).toContain('dev');
		expect(lastFrame()).toContain('test');
	});

	it('shows description when available', () => {
		const { lastFrame } = render(
			<AliasList config={baseConfig} onSave={vi.fn()} onEditAlias={vi.fn()} />,
		);
		expect(lastFrame()).toContain('Start dev server');
	});

	it('shows rule count', () => {
		const { lastFrame } = render(
			<AliasList config={baseConfig} onSave={vi.fn()} onEditAlias={vi.fn()} />,
		);
		expect(lastFrame()).toContain('1 rule');
	});
});
