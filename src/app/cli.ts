#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Argument } from 'commander';
import omelette from 'omelette';
import { createCLI, fatalError, formatError, getExitCode, runIfMain } from '@yaos-git/toolkit/cli';
import { bootstrapStarterConfig, loadConfig } from '../utils/config/index.js';
import { execute } from '../utils/executor/index.js';
import { findBestMatch } from '../utils/matcher/index.js';
import { resolveAlias } from '../utils/resolver/index.js';

declare const __CLI_VERSION__: string;

const printList = (config: ReturnType<typeof loadConfig>): void => {
	const cwd = process.cwd();
	const env = process.env;

	for (const [name, alias] of Object.entries(config.aliases)) {
		const match = findBestMatch(alias.rules, cwd, env);
		const desc = alias.description ? chalk.dim(` — ${alias.description}`) : '';

		console.log(`  ${chalk.cyan.bold(name)}${desc}`);
		if (match) {
			console.log(
				`    ${chalk.dim('→')} ${chalk.green(match.command)} ${chalk.dim(`(score: ${match.score})`)}`,
			);
		} else if (alias.fallback) {
			console.log(
				`    ${chalk.dim('→')} ${chalk.yellow(alias.fallback)} ${chalk.dim('(fallback)')}`,
			);
		} else {
			console.log(`    ${chalk.red.dim('→ (no match)')}`);
		}
	}
};

export async function runCLI(args: string[] = process.argv.slice(2)): Promise<void> {
	const config = loadConfig();
	const aliasNames = Object.keys(config.aliases);

	const completion = omelette('run-ctx|rc');
	completion.on('complete', (_alias, { reply }) => {
		reply(aliasNames);
	});
	completion.init();

	// Intercept '--' before Commander processes it so passthrough args
	// are preserved for alias resolution.
	const dashDashIndex = args.indexOf('--');
	let commanderArgs = args;
	let passthroughFromSeparator: string[] = [];

	if (dashDashIndex !== -1) {
		commanderArgs = args.slice(0, dashDashIndex);
		passthroughFromSeparator = args.slice(dashDashIndex + 1);
	}

	const { program } = createCLI({
		name: 'run-ctx',
		description:
			'Context-aware command alias CLI — run the right command based on cwd, files, and env vars',
		version: __CLI_VERSION__,
	});

	program.configureOutput({
		writeOut: (str) => { console.log(str); },
		writeErr: (str) => { console.error(str); },
	});

	program
		.command('completions')
		.description('Print shell completion script')
		.addArgument(new Argument('<shell>', 'Shell type').choices(['bash', 'zsh', 'fish']))
		.action((shell: string) => {
			console.log(
				// biome-ignore lint/suspicious/noExplicitAny: omelette types are incomplete
				(completion as any).generateCompletionCode(shell, 'run-ctx'),
			);
			process.exitCode = 0;
		});

	program
		.argument('[args...]', 'Alias name (dot-notation) followed by extra arguments')
		.option('-l, --list', 'List all aliases and matched commands for current context')
		.option('--init', 'Bootstrap a new rich starter configuration')
		.option('--dry-run', 'Show what command would run without executing')
		.option('--shell', 'Run command in shell (allows pipe, redirect, &&)')
		.option('-e, --edit', 'Open the interactive TUI editor')
		.option('-v, --verbose', 'Show detailed rule evaluation logs')
		.addHelpText(
			'after',
			aliasNames.length > 0
				? `\nAvailable aliases:\n${aliasNames.map((n) => `  ${n}`).join('\n')}`
				: '',
		)
		.action(
			(
				args: string[],
				options: {
					list?: boolean;
					init?: boolean;
					edit?: boolean;
					dryRun?: boolean;
					shell?: boolean;
					verbose?: boolean;
				},
			) => {
				if (options.edit) {
					const thisDir = dirname(fileURLToPath(import.meta.url));
					const tuiPath = resolve(thisDir, 'tui.js');
					try {
						execFileSync('node', [tuiPath], { stdio: 'inherit' });
						process.exitCode = 0;
					} catch {
						try {
							execFileSync('run-ctx-editor', [], { stdio: 'inherit' });
							process.exitCode = 0;
						} catch {
							console.error('Could not launch run-ctx-editor.');
							process.exitCode = 1;
						}
					}
					return;
				}

				if (options.list) {
					printList(config);
					process.exitCode = 0;
					return;
				}

				if (options.init) {
					try {
						const finalPath = bootstrapStarterConfig();
						console.log(chalk.green('Successfully initialized run-ctx configuration!'));
						console.log(`Created: ${chalk.cyan(finalPath)}`);
						console.log(`Run ${chalk.yellow('run-ctx --list')} to explore your new aliases.`);
						process.exitCode = 0;
						return;
					} catch (err) {
						console.error(chalk.red(formatError(err) || 'Failed to initialize config'));
						console.error('If you want to start fresh, delete it first.');
						process.exitCode = 1;
						return;
					}
				}

				if (options.dryRun) {
					if (args.length === 0) {
						console.error('Usage: run-ctx --dry-run <alias>');
						process.exitCode = 1;
						return;
					}
					const resolvedDry = resolveAlias(config.aliases, args);
					if (!resolvedDry) {
						console.error(`Unknown alias: "${args[0]}"`);
						process.exitCode = 1;
						return;
					}
					const { alias: dryAlias, aliasName } = resolvedDry;
					const match = findBestMatch(dryAlias.rules, process.cwd(), process.env, {
						verbose: options.verbose,
						aliasName,
					});
					if (match) {
						console.log(match.command);
					} else if (dryAlias.fallback) {
						console.log(dryAlias.fallback);
					} else {
						console.error(`No matching rule for "${aliasName}" in this context.`);
						process.exitCode = 1;
						return;
					}
					process.exitCode = 0;
					return;
				}

				if (args.length === 0) {
					program.help();
					return;
				}

				const resolverArgs =
					passthroughFromSeparator.length > 0
						? [...args, '--', ...passthroughFromSeparator]
						: args;

				const resolved = resolveAlias(config.aliases, resolverArgs);
				if (resolved) {
					const { alias, passthroughArgs } = resolved;
					const cwd = process.cwd();
					const match = findBestMatch(alias.rules, cwd, process.env, {
						verbose: options.verbose,
						aliasName: resolved.aliasName,
					});

					if (match) {
						const exitCode = execute(match.command, passthroughArgs, {
							shell: options.shell || match.rule.shell || alias.shell,
						});
						process.exitCode = exitCode;
						return;
					} else if (alias.fallback) {
						const exitCode = execute(alias.fallback, passthroughArgs, {
							shell: options.shell || alias.shell,
						});
						process.exitCode = exitCode;
						return;
					} else {
						console.error(`No matching rule for alias "${resolved.aliasName}" in this context.`);
						console.error(`  cwd: ${cwd}`);
						console.error(`  rules checked: ${alias.rules.length}`);
						process.exitCode = 1;
						return;
					}
				}

				console.error(`Unknown alias or option: "${args[0]}"`);
				console.error('Run "run-ctx --help" for usage information.');
				process.exitCode = 1;
			},
		);

	try {
		await program.parseAsync(commanderArgs, { from: 'user' });
	} catch (err) {
		if (err instanceof Error && 'exitCode' in err) {
			process.exitCode = getExitCode(err);
		} else {
			fatalError(formatError(err));
		}
	}
}

runIfMain(import.meta.url, () => runCLI());
