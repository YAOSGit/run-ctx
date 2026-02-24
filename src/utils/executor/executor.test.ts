import { describe, expect, it } from 'vitest';
import { buildCommandArgs, parseCommand } from './index.js';

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
});
