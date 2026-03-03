import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const CLI_PATH = path.resolve(import.meta.dirname, '../dist/cli.js');

describe('Dry Run E2E', () => {
	let tempHome: string;
	let configDir: string;
	let configPath: string;
	let tempProject: string;

	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-e2e-dryrun-'));
		configDir = path.join(tempHome, 'run-ctx');
		configPath = path.join(configDir, 'config.json');
		tempProject = fs.mkdtempSync(
			path.join(os.tmpdir(), 'run-ctx-proj-dryrun-'),
		);

		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					serve: {
						description: 'Start server',
						rules: [
							{
								match: { file: 'server.js' },
								command: 'node server.js',
							},
							{
								match: { file: 'app.py' },
								command: 'python app.py',
							},
						],
						fallback: 'echo no-server-found',
					},
					nofallback: {
						description: 'No fallback alias',
						rules: [
							{
								match: { file: 'rare-file.xyz' },
								command: 'echo rare',
							},
						],
					},
				},
			}),
		);
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

	it('shows matched command in dry-run mode', async () => {
		fs.writeFileSync(path.join(tempProject, 'server.js'), '');

		const { stdout, exitCode } = await runCli(['--dry-run', 'serve']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('node server.js');
	});

	it('shows fallback command when no rules match', async () => {
		// No matching files in tempProject
		const { stdout, exitCode } = await runCli(['--dry-run', 'serve']);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('echo no-server-found');
	});

	it('nonexistent alias shows error', async () => {
		const { stderr, exitCode } = await runCli([
			'--dry-run',
			'nonexistent-alias-xyz',
		]);
		expect(exitCode).toBe(1);
		expect(stderr).toContain('Unknown alias');
	});

	it('--verbose with --dry-run shows scoring details', async () => {
		fs.writeFileSync(path.join(tempProject, 'server.js'), '');

		const { stdout, stderr, exitCode } = await runCli([
			'--dry-run',
			'--verbose',
			'serve',
		]);
		expect(exitCode).toBe(0);
		expect(stdout.trim()).toBe('node server.js');
		// Verbose output goes to stderr
		expect(stderr).toContain('Evaluating alias');
		expect(stderr).toContain('Rule 1');
		expect(stderr).toContain('Rule 2');
		expect(stderr).toContain('Winner');
		expect(stderr).toContain('score');
	});
});
