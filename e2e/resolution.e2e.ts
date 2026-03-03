import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const CLI_PATH = path.resolve(import.meta.dirname, '../dist/cli.js');

describe('Alias Resolution E2E', () => {
	let tempHome: string;
	let configDir: string;
	let configPath: string;
	let tempProject: string;

	beforeEach(() => {
		tempHome = fs.mkdtempSync(
			path.join(os.tmpdir(), 'run-ctx-e2e-resolution-'),
		);
		configDir = path.join(tempHome, 'run-ctx');
		configPath = path.join(configDir, 'config.json');
		tempProject = fs.mkdtempSync(
			path.join(os.tmpdir(), 'run-ctx-proj-resolution-'),
		);

		fs.mkdirSync(configDir, { recursive: true });
	});

	afterEach(() => {
		fs.rmSync(tempHome, { recursive: true, force: true });
		fs.rmSync(tempProject, { recursive: true, force: true });
	});

	const runCli = async (
		args: string[],
		cwd = tempProject,
		extraEnv: Record<string, string> = {},
	) => {
		try {
			const { stdout, stderr } = await exec('node', [CLI_PATH, ...args], {
				env: {
					...process.env,
					XDG_CONFIG_HOME: tempHome,
					...extraEnv,
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

	it('specificity scoring: file+env beats file alone', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					deploy: {
						description: 'Deploy command',
						rules: [
							{
								match: { file: 'Dockerfile' },
								command: 'echo docker-only',
							},
							{
								match: { file: 'Dockerfile', env: 'CI' },
								command: 'echo docker-ci',
							},
						],
						fallback: 'echo fallback',
					},
				},
			}),
		);
		fs.writeFileSync(path.join(tempProject, 'Dockerfile'), '');

		const { stdout, exitCode } = await runCli(
			['--dry-run', 'deploy'],
			tempProject,
			{ CI: 'true' },
		);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo docker-ci');
	});

	it('array file conditions: matches when ALL required files exist', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					setup: {
						description: 'Setup project',
						rules: [
							{
								match: { file: ['package.json', 'tsconfig.json'] },
								command: 'echo typescript-project',
							},
						],
						fallback: 'echo generic',
					},
				},
			}),
		);
		// Create both files
		fs.writeFileSync(path.join(tempProject, 'package.json'), '{}');
		fs.writeFileSync(path.join(tempProject, 'tsconfig.json'), '{}');

		const { stdout, exitCode } = await runCli(['--dry-run', 'setup']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo typescript-project');
	});

	it('array file conditions negative: only one of required files exists falls back', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					setup: {
						description: 'Setup project',
						rules: [
							{
								match: { file: ['package.json', 'tsconfig.json'] },
								command: 'echo typescript-project',
							},
						],
						fallback: 'echo generic',
					},
				},
			}),
		);
		// Only create one of the two required files
		fs.writeFileSync(path.join(tempProject, 'package.json'), '{}');

		const { stdout, exitCode } = await runCli(['--dry-run', 'setup']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo generic');
	});

	it('env-var match: set env var triggers rule', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					serve: {
						description: 'Run server',
						rules: [
							{
								match: { env: 'TEST_VAR' },
								command: 'echo env-matched',
							},
						],
						fallback: 'echo no-env',
					},
				},
			}),
		);

		const { stdout, exitCode } = await runCli(
			['--dry-run', 'serve'],
			tempProject,
			{ TEST_VAR: 'hello' },
		);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo env-matched');
	});

	it('env-var unset: same rule without env var falls back', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					serve: {
						description: 'Run server',
						rules: [
							{
								match: { env: 'RUN_CTX_E2E_MISSING_VAR' },
								command: 'echo env-matched',
							},
						],
						fallback: 'echo no-env',
					},
				},
			}),
		);

		// Ensure the env var is not set
		const envWithout = { ...process.env, XDG_CONFIG_HOME: tempHome };
		delete envWithout.RUN_CTX_E2E_MISSING_VAR;

		const { stdout, exitCode } = await runCli(['--dry-run', 'serve']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo no-env');
	});

	it('cwd regex match: cwd contains pattern triggers rule', async () => {
		// Create a temp project with a recognizable name
		const namedProject = fs.mkdtempSync(path.join(os.tmpdir(), 'my-project-'));
		try {
			fs.writeFileSync(
				configPath,
				JSON.stringify({
					version: 2,
					aliases: {
						run: {
							description: 'Run command',
							rules: [
								{
									match: { cwd: 'my-project' },
									command: 'echo cwd-matched',
								},
							],
							fallback: 'echo cwd-nomatch',
						},
					},
				}),
			);

			const { stdout, exitCode } = await runCli(
				['--dry-run', 'run'],
				namedProject,
			);
			expect(exitCode).toBe(0);
			expect(stdout.trim()).toBe('echo cwd-matched');
		} finally {
			fs.rmSync(namedProject, { recursive: true, force: true });
		}
	});

	it('passthrough args with --: extra args after -- passed through', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					mycmd: {
						description: 'Test passthrough',
						rules: [{ match: {}, command: 'echo base' }],
					},
				},
			}),
		);

		// In dry-run mode the command is shown without passthrough args
		// But the alias should resolve correctly
		const { stdout, exitCode } = await runCli([
			'--dry-run',
			'mycmd',
			'--',
			'extra1',
			'extra2',
		]);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo base');
	});

	it('multiple matching rules: highest specificity wins', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					multi: {
						description: 'Multi-rule test',
						rules: [
							{
								match: { file: 'package.json' },
								command: 'echo file-only',
							},
							{
								match: { file: 'package.json', cwd: '.*' },
								command: 'echo file-and-cwd',
							},
						],
						fallback: 'echo fallback',
					},
				},
			}),
		);
		fs.writeFileSync(path.join(tempProject, 'package.json'), '{}');

		const { stdout, exitCode } = await runCli(['--dry-run', 'multi']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo file-and-cwd');
	});

	it('fallback when no rules match: returns fallback command', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					fb: {
						description: 'Fallback test',
						rules: [
							{
								match: { file: 'nonexistent-file.xyz' },
								command: 'echo matched',
							},
						],
						fallback: 'echo this-is-fallback',
					},
				},
			}),
		);

		const { stdout, exitCode } = await runCli(['--dry-run', 'fb']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo this-is-fallback');
	});

	it('no fallback and no match: returns error', async () => {
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					nofb: {
						description: 'No fallback test',
						rules: [
							{
								match: { file: 'nonexistent-file.xyz' },
								command: 'echo matched',
							},
						],
					},
				},
			}),
		);

		const { stderr, exitCode } = await runCli(['--dry-run', 'nofb']);
		expect(exitCode).toBe(1);
		expect(stderr).toContain('No matching rule');
	});
});
