import { describe, expect, it, vi } from 'vitest';
import { buildCommandArgs, execute, parseCommand } from './index.js';

vi.mock('@yaos-git/toolkit/cli', () => ({
	spawnCommand: vi.fn(),
}));

import { spawnCommand } from '@yaos-git/toolkit/cli';

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
			vi.mocked(spawnCommand).mockReturnValueOnce(0);

			const code = execute('echo hello', []);
			expect(code).toBe(0);
			expect(spawnCommand).toHaveBeenCalledWith('echo', ['hello']);
		});

		it('returns exit code from spawnCommand when command fails', () => {
			vi.mocked(spawnCommand).mockReturnValueOnce(1);

			const code = execute('nonexistent-binary-xyz', []);
			expect(code).toBe(1);
		});

		it('delegates to spawnCommand with shell option', () => {
			vi.mocked(spawnCommand).mockReturnValueOnce(0);

			const code = execute('echo hello && echo world', [], { shell: true });
			expect(code).toBe(0);
			expect(spawnCommand).toHaveBeenCalledWith(
				'echo hello && echo world',
				[],
				{ shell: true },
			);
		});

		it('returns signal exit code passed through from spawnCommand', () => {
			vi.mocked(spawnCommand).mockReturnValueOnce(143); // 128 + SIGTERM(15)

			const code = execute('sleep 100', []);
			expect(code).toBe(143);
		});

		it('returns fallback exit code of 1 from spawnCommand', () => {
			vi.mocked(spawnCommand).mockReturnValueOnce(1);

			const code = execute('unknown-state', []);
			expect(code).toBe(1);
		});
	});
});
