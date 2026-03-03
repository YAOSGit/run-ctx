import { render } from 'ink-testing-library';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import type { Rule } from '../../types/Rule/index.js';
import { RuleDetail } from './index.js';

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
		expect(lastFrame()).toContain('1. package.json');
		expect(lastFrame()).toContain('2. pnpm-lock.yaml');
	});

	describe('keyboard interactions', () => {
		let onSave: Mock;
		let onBack: Mock;

		beforeEach(() => {
			onSave = vi.fn();
			onBack = vi.fn();
		});

		it('navigates with arrows and edits field on enter', async () => {
			const delay = () => new Promise((r) => setTimeout(r, 50));
			const { stdin } = render(
				<RuleDetail rule={rule} onSave={onSave} onBack={onBack} />,
			);
			await delay();

			// Move down to 'file' field
			stdin.write('\u001B[B');
			await delay();

			// Enter to edit
			stdin.write('\r');
			await delay();

			// Append '2'
			stdin.write('2');
			await delay();

			// Enter to save
			stdin.write('\r');
			await delay();

			expect(onSave).toHaveBeenCalledWith({
				match: { file: 'package.json2', env: 'NODE_ENV' },
				command: 'npm run dev',
			});
		});

		it('adds new condition entry on a', async () => {
			const delay = () => new Promise((r) => setTimeout(r, 50));
			const { stdin } = render(
				<RuleDetail rule={rule} onSave={onSave} onBack={onBack} />,
			);
			await delay();

			// Move down to 'file' field
			stdin.write('\u001B[B');
			await delay();

			// a to add new entry
			stdin.write('a');
			await delay();

			// We are now in edit mode for the new entry, type 'yarn.lock'
			stdin.write('yarn.lock');
			await delay();

			// Enter to save
			stdin.write('\r');
			await delay();

			expect(onSave).toHaveBeenCalledWith({
				match: { file: ['package.json', 'yarn.lock'], env: 'NODE_ENV' },
				command: 'npm run dev',
			});
		});

		it('deletes condition entry on d', async () => {
			const delay = () => new Promise((r) => setTimeout(r, 50));
			const { stdin } = render(
				<RuleDetail rule={rule} onSave={onSave} onBack={onBack} />,
			);
			await delay();

			// Move down to 'file' field
			stdin.write('\u001B[B');
			await delay();

			// d to delete 'package.json'
			stdin.write('d');
			await delay();

			// Confirm with y
			stdin.write('y');
			await delay();

			expect(onSave).toHaveBeenCalledWith({
				match: { env: 'NODE_ENV' },
				command: 'npm run dev',
			});
		});

		it('goes back on escape or q', async () => {
			const delay = () => new Promise((r) => setTimeout(r, 50));
			const { stdin } = render(
				<RuleDetail rule={rule} onSave={onSave} onBack={onBack} />,
			);
			await delay();

			stdin.write('q');
			await delay();

			expect(onBack).toHaveBeenCalled();
		});
	});
});
