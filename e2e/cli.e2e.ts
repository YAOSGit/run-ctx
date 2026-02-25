import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const exec = promisify(execFile);
const CLI_PATH = path.resolve(import.meta.dirname, '../dist/cli.js');

describe('CLI E2E Tests', () => {
    let tempHome: string;
    let configDir: string;
    let configPath: string;
    let tempProject: string;

    beforeEach(() => {
        tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-e2e-'));
        configDir = path.join(tempHome, 'run-ctx');
        configPath = path.join(configDir, 'config.json');

        tempProject = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-project-'));
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
        } catch (error: any) {
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                exitCode: error.code || 1,
            };
        }
    };

    describe('--init command', () => {
        it('creates a new starter config when none exists', async () => {
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

        it('aborts if config already exists', async () => {
            await runCli(['--init']); // Create it first

            // Try again
            const { stderr, exitCode } = await runCli(['--init']);

            expect(exitCode).toBe(1);
            expect(stderr).toContain('A configuration file already exists');
        });
    });

    describe('Basic flags', () => {
        it('shows help with --help', async () => {
            const { stdout, exitCode } = await runCli(['--help']);
            expect(exitCode).toBe(0);
            expect(stdout).toContain('Usage: run-ctx <alias> [args...]');
            expect(stdout).toContain('--init');
        });

        it('shows version with --version', async () => {
            const { stdout, exitCode } = await runCli(['--version']);
            expect(exitCode).toBe(0);
            expect(stdout).toMatch(/run-ctx v\d+\.\d+\.\d+/);
        });

        it('lists aliases with --list', async () => {
            await runCli(['--init']); // Need config to list anything meaningful
            const { stdout, exitCode } = await runCli(['--list']);
            expect(exitCode).toBe(0);
            expect(stdout).toContain('dev');
            expect(stdout).toContain('build');
            expect(stdout).toContain('test');
        });
    });

    describe('Command resolution', () => {
        beforeEach(() => {
            // Write a custom config for these tests
            fs.mkdirSync(configDir, { recursive: true });
            fs.writeFileSync(
                configPath,
                JSON.stringify({
                    version: 2,
                    aliases: {
                        testcmd: {
                            description: 'A test command',
                            rules: [
                                { match: { file: 'special.txt' }, command: 'echo special' },
                                { match: { file: 'package.json' }, command: 'echo package' },
                            ],
                            fallback: 'echo fallback',
                        },
                        'foo.bar': {
                            rules: [{ match: { file: 'any.txt' }, command: 'echo foobar' }],
                        },
                    },
                }),
            );
        });

        it('resolves fallback when no files match', async () => {
            const { stdout, exitCode } = await runCli(['--dry-run', 'testcmd']);
            expect(exitCode).toBe(0);
            expect(stdout.trim()).toBe('echo fallback');
        });

        it('resolves the correct rule based on file presence', async () => {
            // Create 'package.json' to trigger the second rule
            fs.writeFileSync(path.join(tempProject, 'package.json'), '{}');

            const { stdout, exitCode } = await runCli(['--dry-run', 'testcmd']);
            expect(exitCode).toBe(0);
            expect(stdout.trim()).toBe('echo package');
        });

        it('supports greedy dot-notation resolution', async () => {
            fs.writeFileSync(path.join(tempProject, 'any.txt'), 'content');

            // Calling foo bar baz should resolve to foo.bar and pass baz
            const { stdout, stderr, exitCode } = await runCli(['--dry-run', 'foo', 'bar', 'baz']);
            if (exitCode !== 0) console.log('DEBUG:', { stdout, stderr });
            expect(exitCode).toBe(0);
            expect(stdout.trim()).toBe('echo foobar');
        });
    });
});
