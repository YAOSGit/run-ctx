import { execFileSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as configModule from '../utils/config/index.js';
import * as executorModule from '../utils/executor/index.js';
import * as matcherModule from '../utils/matcher/index.js';
import * as resolveModule from '../utils/resolver/index.js';

import { runCLI } from './cli.js';

vi.mock('../utils/config/index.js', () => ({
	loadConfig: vi.fn(),
	saveConfig: vi.fn(),
	getConfigPath: vi.fn(),
	bootstrapStarterConfig: vi.fn().mockReturnValue('/fake/path/config.json'),
}));

vi.mock('../utils/resolver/index.js', async (importOriginal) => {
	const mod =
		await importOriginal<typeof import('../utils/resolver/index.js')>();
	return {
		...mod,
		resolveAlias: vi.fn((_aliases: any, args: string[]) => {
			if (args[0]?.startsWith('--')) return null;
			return null;
		}),
	};
});

vi.mock('../utils/executor/index.js', () => ({
	execute: vi.fn(),
}));

vi.mock('../utils/matcher/index.js', () => ({
	findBestMatch: vi.fn(),
}));

vi.mock('node:child_process', () => ({
	execFileSync: vi.fn(),
}));

describe('CLI execution', () => {
	let exitSpy: any;
	let consoleLogSpy: any;
	let consoleErrorSpy: any;

	beforeEach(() => {
		exitSpy = vi
			.spyOn(process, 'exit')
			.mockImplementation(() => undefined as never);
		consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
		consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		vi.mocked(configModule.loadConfig).mockReturnValue({
			version: 1,
			aliases: {
				'foo.bar': { rules: [{ command: 'echo nested', match: {} }] },
				foo: { rules: [{ command: 'echo root', match: {} }] },
			},
		});

		vi.mocked(executorModule.execute).mockReturnValue(0);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('T6: --dry-run delegates to resolveAlias to ensure consistency with normal execution', () => {
		const rule = { command: 'echo nested', match: {} };
		const fakeMatch = {
			alias: { rules: [rule] },
			aliasName: 'foo.bar',
			passthroughArgs: [],
		};
		vi.mocked(resolveModule.resolveAlias).mockReturnValueOnce(fakeMatch as any);
		vi.mocked(matcherModule.findBestMatch).mockReturnValueOnce({
			command: 'echo nested',
			score: 1,
			rule,
		} as any);

		runCLI(['--dry-run', 'foo', 'bar']);

		expect(resolveModule.resolveAlias).toHaveBeenLastCalledWith(
			expect.anything(),
			['foo', 'bar'],
		);
		expect(consoleLogSpy).toHaveBeenCalledWith('echo nested');
	});

	it('T7: --init creates a new starter config when none exists', () => {
		vi.mocked(configModule.bootstrapStarterConfig).mockReturnValueOnce(
			'/fake/path/config.json',
		);

		runCLI(['--init']);

		expect(configModule.bootstrapStarterConfig).toHaveBeenCalled();
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('Successfully initialized'),
		);
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('T8: --init aborts and exits if config already exists', () => {
		vi.mocked(configModule.bootstrapStarterConfig).mockImplementationOnce(
			() => {
				throw new Error('A configuration file already exists');
			},
		);

		runCLI(['--init']);

		expect(configModule.bootstrapStarterConfig).toHaveBeenCalled();
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('A configuration file already exists'),
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('--help prints help text and exits with code 0', () => {
		runCLI(['--help']);

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('Usage: run-ctx'),
		);
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('-h prints help text and exits with code 0', () => {
		runCLI(['-h']);

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('Usage: run-ctx'),
		);
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('--help lists available aliases', () => {
		runCLI(['--help']);

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('Available aliases:'),
		);
	});

	it('--version prints version info and exits with code 0', () => {
		runCLI(['--version']);

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('run-ctx v'),
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('Node.js'),
		);
		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('Platform:'),
		);
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('-v prints version info and exits with code 0', () => {
		runCLI(['-v']);

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('run-ctx v'),
		);
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('--list prints alias list and exits with code 0', () => {
		vi.mocked(matcherModule.findBestMatch).mockReturnValue(null);

		runCLI(['--list']);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('foo'));
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('-l prints alias list and exits with code 0', () => {
		vi.mocked(matcherModule.findBestMatch).mockReturnValue(null);

		runCLI(['-l']);

		expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('foo'));
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('--list shows matched commands when a rule matches', () => {
		vi.mocked(matcherModule.findBestMatch).mockReturnValue({
			command: 'echo root',
			score: 1,
			rule: { command: 'echo root', match: {} },
		} as any);

		runCLI(['--list']);

		expect(consoleLogSpy).toHaveBeenCalledWith(
			expect.stringContaining('echo root'),
		);
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('--completions generates completion code and exits with code 0', () => {
		runCLI(['--completions', 'bash']);

		expect(consoleLogSpy).toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('--completions rejects invalid shell names', () => {
		runCLI(['--completions', 'powershell']);

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('Usage: run-ctx --completions'),
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});

	it('--edit launches the editor and exits with code 0', () => {
		vi.mocked(execFileSync as any).mockImplementation(() => undefined);

		runCLI(['--edit']);

		expect(execFileSync).toHaveBeenCalledWith(
			'node',
			[expect.stringContaining('editor-cli.js')],
			{ stdio: 'inherit' },
		);
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('-e launches the editor and exits with code 0', () => {
		vi.mocked(execFileSync as any).mockImplementation(() => undefined);

		runCLI(['-e']);

		expect(execFileSync).toHaveBeenCalled();
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('--edit falls back to run-ctx-editor when node path fails', () => {
		vi.mocked(execFileSync as any)
			.mockImplementationOnce(() => {
				throw new Error('ENOENT');
			})
			.mockImplementationOnce(() => undefined);

		runCLI(['--edit']);

		expect(execFileSync).toHaveBeenCalledWith('run-ctx-editor', [], {
			stdio: 'inherit',
		});
		expect(exitSpy).toHaveBeenCalledWith(0);
	});

	it('--edit exits with code 1 when both editor paths fail', () => {
		vi.mocked(execFileSync as any).mockImplementation(() => {
			throw new Error('ENOENT');
		});

		runCLI(['--edit']);

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			'Could not launch run-ctx-editor.',
		);
		expect(exitSpy).toHaveBeenCalledWith(1);
	});
});
