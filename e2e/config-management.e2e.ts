import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const CLI_PATH = path.resolve(import.meta.dirname, '../dist/cli.js');

describe('Config Management E2E', () => {
	let tempHome: string;
	let configDir: string;
	let configPath: string;
	let tempProject: string;

	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-e2e-config-'));
		configDir = path.join(tempHome, 'run-ctx');
		configPath = path.join(configDir, 'config.json');
		tempProject = fs.mkdtempSync(
			path.join(os.tmpdir(), 'run-ctx-proj-config-'),
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

	it('--init creates default config with expected aliases', async () => {
		const { stdout, exitCode } = await runCli(['--init']);
		expect(exitCode).toBe(0);
		expect(stdout).toContain('Successfully initialized run-ctx configuration!');
		expect(stdout).toContain(configPath);

		expect(fs.existsSync(configPath)).toBe(true);

		const configContent = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
		expect(configContent.version).toBe(2);
		expect(configContent.aliases).toHaveProperty('dev');
		expect(configContent.aliases).toHaveProperty('build');
		expect(configContent.aliases).toHaveProperty('test');
		expect(configContent.aliases).toHaveProperty('lint');
	});

	it('--init aborts if config already exists', async () => {
		// Create config first
		await runCli(['--init']);

		// Try again
		const { stderr, exitCode } = await runCli(['--init']);
		expect(exitCode).toBe(1);
		expect(stderr).toContain('A configuration file already exists');
	});

	it('malformed JSON config shows warning and uses defaults', async () => {
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(configPath, '{ this is not valid JSON !!!');

		// Running an alias with malformed config should warn about it
		const { stderr } = await runCli(['--list']);
		// loadConfig logs a warning to stderr and returns defaults
		expect(stderr).toContain('malformed');
	});

	it('missing config with no init: running alias shows error or empty behavior', async () => {
		// No config exists. Running an alias that doesn't exist should fail.
		const { stderr, exitCode } = await runCli(['somealias']);
		expect(exitCode).toBe(1);
		expect(stderr).toContain('Unknown alias');
	});

	it('missing alias in valid config shows error message', async () => {
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					existing: {
						description: 'Exists',
						rules: [{ match: {}, command: 'echo ok' }],
					},
				},
			}),
		);

		const { stderr, exitCode } = await runCli(['nonexistent']);
		expect(exitCode).toBe(1);
		expect(stderr).toContain('Unknown alias');
	});
});
