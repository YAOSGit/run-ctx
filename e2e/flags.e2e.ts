import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const CLI_PATH = path.resolve(import.meta.dirname, '../dist/cli.js');

describe('CLI Flags E2E', () => {
	let tempHome: string;
	let configDir: string;
	let configPath: string;
	let tempProject: string;

	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-e2e-flags-'));
		configDir = path.join(tempHome, 'run-ctx');
		configPath = path.join(configDir, 'config.json');
		tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-proj-flags-'));
	});

	afterEach(() => {
		fs.rmSync(tempHome, { recursive: true, force: true });
		fs.rmSync(tempProject, { recursive: true, force: true });
	});

	const runCli = async (args: string[], cwd = tempProject) => {
		try {
			const { stdout, stderr } = await exec('node', [CLI_PATH, ...args], {
				env: {
					...process.env,
					XDG_CONFIG_HOME: tempHome,
				},
				cwd,
			});
			return { stdout, stderr, exitCode: 0 };
		} catch (e: unknown) {
			const error = e as { code?: number; stdout?: string; stderr?: string };
			return {
				stdout: error.stdout || '',
				stderr: error.stderr || '',
				exitCode: error.code || 1,
			};
		}
	};

	it('--help shows usage info', async () => {
		const { stdout, exitCode } = await runCli(['--help']);
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Usage: run-ctx <alias> [args...]');
		expect(stdout).toContain('--init');
		expect(stdout).toContain('--list');
		expect(stdout).toContain('--dry-run');
		expect(stdout).toContain('--version');
	});

	it('--version shows version number', async () => {
		const { stdout, exitCode } = await runCli(['--version']);
		expect(exitCode).toBe(0);
		expect(stdout).toMatch(/run-ctx v\d+\.\d+\.\d+/);
		expect(stdout).toContain('Node.js');
		expect(stdout).toContain('Platform:');
	});

	it('--verbose with --dry-run shows additional scoring info', async () => {
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					mycmd: {
						description: 'Test command',
						rules: [
							{ match: { file: 'package.json' }, command: 'echo node' },
							{ match: { file: 'Cargo.toml' }, command: 'echo rust' },
						],
						fallback: 'echo fallback',
					},
				},
			}),
		);
		fs.writeFileSync(path.join(tempProject, 'package.json'), '{}');

		const { stdout, stderr, exitCode } = await runCli([
			'--dry-run',
			'--verbose',
			'mycmd',
		]);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo node');
		// Verbose output goes to stderr
		expect(stderr).toContain('Evaluating alias');
		expect(stderr).toContain('Rule');
		expect(stderr).toContain('Winner');
	});

	it('--completions bash outputs bash completion script', async () => {
		const { stdout, exitCode } = await runCli(['--completions', 'bash']);
		expect(exitCode).toBe(0);
		expect(stdout).toContain('bash');
		expect(stdout.length).toBeGreaterThan(0);
	});

	it('--completions zsh outputs zsh completion script', async () => {
		const { stdout, exitCode } = await runCli(['--completions', 'zsh']);
		expect(exitCode).toBe(0);
		expect(stdout).toContain('zsh');
		expect(stdout.length).toBeGreaterThan(0);
	});

	it('--completions fish outputs fish completion script', async () => {
		const { stdout, exitCode } = await runCli(['--completions', 'fish']);
		expect(exitCode).toBe(0);
		// omelette generates a generic completion script; verify it contains
		// the run-ctx completion markers and is non-empty
		expect(stdout).toContain('run-ctx completion');
		expect(stdout.length).toBeGreaterThan(0);
	});

	it('--completions invalid shows error for unsupported shell', async () => {
		const { stderr, exitCode } = await runCli(['--completions', 'invalid']);
		expect(exitCode).toBe(1);
		expect(stderr).toContain('bash|zsh|fish');
	});

	it('unknown flag shows error', async () => {
		const { stderr, exitCode } = await runCli(['--nonexistent-flag-xyz']);
		expect(exitCode).not.toBe(0);
		expect(stderr.length).toBeGreaterThan(0);
	});
});
