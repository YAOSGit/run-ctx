import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const CLI_PATH = path.resolve(import.meta.dirname, '../dist/cli.js');

describe('List Command E2E', () => {
	let tempHome: string;
	let configDir: string;
	let configPath: string;
	let tempProject: string;

	beforeEach(() => {
		tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-e2e-list-'));
		configDir = path.join(tempHome, 'run-ctx');
		configPath = path.join(configDir, 'config.json');
		tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-proj-list-'));
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

	it('--list shows all aliases with descriptions', async () => {
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					dev: {
						description: 'Start development server',
						rules: [
							{ match: { file: 'package.json' }, command: 'npm run dev' },
						],
						fallback: 'echo no-dev',
					},
					build: {
						description: 'Build the project',
						rules: [
							{ match: { file: 'package.json' }, command: 'npm run build' },
						],
					},
				},
			}),
		);

		const { stdout, exitCode } = await runCli(['--list']);
		expect(exitCode).toBe(0);
		expect(stdout).toContain('dev');
		expect(stdout).toContain('Start development server');
		expect(stdout).toContain('build');
		expect(stdout).toContain('Build the project');
	});

	it('--list shows fallback indicator for aliases with fallbacks', async () => {
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					serve: {
						description: 'Serve app',
						rules: [
							{
								match: { file: 'nonexistent-file.xyz' },
								command: 'echo matched',
							},
						],
						fallback: 'echo fallback-serve',
					},
				},
			}),
		);

		const { stdout, exitCode } = await runCli(['--list']);
		expect(exitCode).toBe(0);
		expect(stdout).toContain('serve');
		expect(stdout).toContain('fallback');
	});

	it('--list shows dot-notation aliases correctly', async () => {
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {
					'docker.build': {
						description: 'Build Docker image',
						rules: [
							{
								match: { file: 'Dockerfile' },
								command: 'docker build .',
							},
						],
						fallback: 'echo no-dockerfile',
					},
					'docker.push': {
						description: 'Push Docker image',
						rules: [
							{
								match: { file: 'Dockerfile' },
								command: 'docker push myimage',
							},
						],
					},
				},
			}),
		);

		const { stdout, exitCode } = await runCli(['--list']);
		expect(exitCode).toBe(0);
		expect(stdout).toContain('docker.build');
		expect(stdout).toContain('docker.push');
		expect(stdout).toContain('Build Docker image');
		expect(stdout).toContain('Push Docker image');
	});

	it('--list with empty config: graceful handling', async () => {
		fs.mkdirSync(configDir, { recursive: true });
		fs.writeFileSync(
			configPath,
			JSON.stringify({
				version: 2,
				aliases: {},
			}),
		);

		const { exitCode } = await runCli(['--list']);
		expect(exitCode).toBe(0);
		// Should not crash, output may be empty or minimal
	});
});
