import * as ink from 'ink';
import { render } from 'ink-testing-library';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

	describe('keyboard interactions', () => {
		let onSave: any;
		let onEditAlias: any;

		beforeEach(() => {
			onSave = vi.fn();
			onEditAlias = vi.fn();
		});

		it('navigates with up/down arrows and edits on Enter', async () => {
			const delay = () => new Promise((r) => setTimeout(r, 50));
			const { stdin } = render(
				<AliasList
					config={baseConfig}
					onSave={onSave}
					onEditAlias={onEditAlias}
				/>,
			);
			await delay();

			// Press down
			stdin.write('\u001B[B');
			await delay();
			// Press enter
			stdin.write('\r');
			await delay();
			expect(onEditAlias).toHaveBeenCalledWith('test');
		});

		it('creates a new alias on n', async () => {
			const delay = () => new Promise((r) => setTimeout(r, 50));
			const { stdin, lastFrame } = render(
				<AliasList
					config={baseConfig}
					onSave={onSave}
					onEditAlias={onEditAlias}
				/>,
			);
			await delay();

			// Start create
			stdin.write('n');
			await delay();
			expect(lastFrame()).toContain('New alias name:');

			// Type new name
			stdin.write('foo');
			await delay();
			stdin.write('\r');
			await delay();
			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					aliases: expect.objectContaining({
						foo: { rules: [] },
					}),
				}),
			);
		});

		it('deletes an alias on d', async () => {
			const delay = () => new Promise((r) => setTimeout(r, 50));
			const { stdin } = render(
				<AliasList
					config={baseConfig}
					onSave={onSave}
					onEditAlias={onEditAlias}
				/>,
			);
			await delay();

			// Press d on 'dev' alias
			stdin.write('d');
			await delay();

			// Confirm delete with y
			stdin.write('y');
			await delay();

			expect(onSave).toHaveBeenCalledWith(
				expect.objectContaining({
					aliases: { test: baseConfig.aliases.test },
				}),
			);
		});
	});
});
