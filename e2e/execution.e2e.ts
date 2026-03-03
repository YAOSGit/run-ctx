import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const CLI_PATH = path.resolve(import.meta.dirname, '../dist/cli.js');

describe('Command Execution E2E', () => {
	let tempHome: string;
	let configDir: string;
	let configPath: string;
	let tempProject: string;

	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-e2e-exec-'));
		configDir = path.join(tempHome, 'run-ctx');
		configPath = path.join(configDir, 'config.json');
		tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-proj-exec-'));

		fs.mkdirSync(configDir, { recursive: true });
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

	it('executes resolved command and captures stdout', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					greet: {
						description: 'Greeting command',
						rules: [
							{
								match: { file: 'hello.txt' },
								command: 'echo hello-from-rule',
							},
						],
						fallback: 'echo hello-fallback',
					},
				},
			}),
		);
		fs.writeFileSync(path.join(tempProject, 'hello.txt'), 'hi');

		const { stdout, exitCode } = await runCli(['greet']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('hello-from-rule');
	});

	it('executes fallback command when no rules match', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					greet: {
						description: 'Greeting command',
						rules: [
							{
								match: { file: 'nonexistent.xyz' },
								command: 'echo matched',
							},
						],
						fallback: 'echo hello-fallback',
					},
				},
			}),
		);

		const { stdout, exitCode } = await runCli(['greet']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('hello-fallback');
	});

	it('propagates non-zero exit code from executed command', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					fail: {
						description: 'Failing command',
						rules: [{ match: {}, command: 'node -e "process.exit(42)"' }],
					},
				},
			}),
		);

		const { exitCode } = await runCli(['fail']);
		expect(exitCode).not.toBe(0);
	});

	it('shell pipes work with --shell flag', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					piped: {
						description: 'Piped command',
						shell: true,
						rules: [
							{
								match: {},
								command: 'echo hello-world | cat',
								shell: true,
							},
						],
					},
				},
			}),
		);

		const { stdout, exitCode } = await runCli(['--shell', 'piped']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('hello-world');
	});
});
