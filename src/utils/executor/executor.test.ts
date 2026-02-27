import * as childProcess from 'node:child_process';
import os from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { buildCommandArgs, execute, parseCommand } from './index.js';

vi.mock('node:child_process', () => {
	return {
		spawnSync: vi.fn(),
	};
});

describe('executor', () => {
	describe('parseCommand', () => {
		it('splits a simple command into program and args', () => {
			const result = parseCommand('npm run dev');
			expect(result).toEqual({ program: 'npm', args: ['run', 'dev'] });
		});

		it('handles a single-word command', () => {
			const result = parseCommand('ls');
			expect(result).toEqual({ program: 'ls', args: [] });
		});

		it('handles extra whitespace', () => {
			const result = parseCommand('  npm   run   dev  ');
			expect(result).toEqual({ program: 'npm', args: ['run', 'dev'] });
		});

		it('handles quoted arguments', () => {
			const result = parseCommand('docker run --name "my container" nginx');
			expect(result).toEqual({
				program: 'docker',
				args: ['run', '--name', 'my container', 'nginx'],
			});
		});

		it('handles single quoted arguments', () => {
			const result = parseCommand("echo 'hello world'");
			expect(result).toEqual({ program: 'echo', args: ['hello world'] });
		});
	});

	describe('buildCommandArgs', () => {
		it('appends passthrough args', () => {
			const result = buildCommandArgs('npm run dev', ['--port', '3000']);
			expect(result).toEqual({
				program: 'npm',
				args: ['run', 'dev', '--port', '3000'],
			});
		});

		it('works with no passthrough args', () => {
			const result = buildCommandArgs('cargo test', []);
			expect(result).toEqual({ program: 'cargo', args: ['test'] });
		});
	});

	describe('execute', () => {
		it('returns exit code 0 on success', () => {
			vi.mocked(childProcess.spawnSync).mockReturnValueOnce({
				status: 0,
				signal: null,
				error: undefined,
				pid: 123,
				output: [],
				stdout: '',
				stderr: '',
			} as any);

			const code = execute('echo hello', []);
			expect(code).toBe(0);
			expect(childProcess.spawnSync).toHaveBeenCalledWith(
				'echo',
				['hello'],
				expect.any(Object),
			);
		});

		it('returns exit code 1 and logs error when command program does not exist', () => {
			const consoleErrorSpy = vi
				.spyOn(console, 'error')
				.mockImplementation(() => {});
			vi.mocked(childProcess.spawnSync).mockReturnValueOnce({
				status: null,
				signal: null,
				error: new Error('ENOENT: no such file or directory'),
				pid: 0,
				output: [],
				stdout: '',
				stderr: '',
			} as any);

			const code = execute('nonexistent-binary-xyz', []);
			expect(code).toBe(1);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Failed to execute: nonexistent-binary-xyz',
			);
			consoleErrorSpy.mockRestore();
		});

		it('returns signal exit code correctly when process is killed', () => {
			vi.mocked(childProcess.spawnSync).mockReturnValueOnce({
				status: null,
				signal: 'SIGTERM',
				error: undefined,
				pid: 123,
				output: [],
				stdout: '',
				stderr: '',
			} as any);

			const code = execute('sleep 100', []);
			expect(code).toBe(128 + os.constants.signals.SIGTERM);
		});

		it('returns fallback exit code of 1 when status is null without error or signal', () => {
			vi.mocked(childProcess.spawnSync).mockReturnValueOnce({
				status: null,
				signal: null,
				error: undefined,
				pid: 123,
				output: [],
				stdout: '',
				stderr: '',
			} as any);

			const code = execute('unknown-state', []);
			expect(code).toBe(1);
		});
	});
});
