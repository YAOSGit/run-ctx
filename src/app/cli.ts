#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { Command } from 'commander';
import omelette from 'omelette';
import { bootstrapStarterConfig, loadConfig } from '../utils/config/index.js';
import { execute } from '../utils/executor/index.js';
import { findBestMatch } from '../utils/matcher/index.js';
import { resolveAlias } from '../utils/resolver/index.js';

declare const __CLI_VERSION__: string;

function printVersion(): string {
	return [
		`run-ctx v${__CLI_VERSION__}`,
		`Node.js ${process.version}`,
		`Platform: ${process.platform} ${process.arch}`,
	].join('\n');
}

function printHelp(aliasNames: string[]): void {
	console.log('Usage: run-ctx <alias> [args...]');
	console.log('       rc <alias> [args...]');
	console.log('       run-ctx --list');
	console.log('       run-ctx --dry-run <alias>');
	console.log('       run-ctx --edit');
	console.log('       run-ctx --init');
	console.log('');
	console.log('Options:');
	console.log(
		'  --list       List all aliases and matched commands for current context',
	);
	console.log('  --init       Bootstrap a new rich starter configuration');
	console.log('  --dry-run    Show what command would run without executing');
	console.log('  --edit       Launch the TUI editor (run-ctx-editor)');
	console.log(
		'  --completions Generate shell completion script (bash, zsh, fish)',
	);
	console.log(
		'  --shell      Run command in shell (allows pipe, redirect, &&)',
	);
	console.log('  --verbose, -V Show detailed rule evaluation logs');
	console.log('  --help       Show this help message');
	console.log('  --version    Show version information');

	if (aliasNames.length > 0) {
		console.log('');
		console.log('Available aliases:');
		for (const name of aliasNames) {
			console.log(`  ${name}`);
		}
	}
}

function printList(config: ReturnType<typeof loadConfig>): void {
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
}

export function runCLI(args: string[] = process.argv.slice(2)): void {
	const config = loadConfig();
	const aliasNames = Object.keys(config.aliases);

	const completion = omelette('run-ctx|rc');
	completion.on('complete', (_alias, { reply }) => {
		reply(aliasNames);
	});
	completion.init();

	// Intercept '--' before Commander processes it, so passthrough args
	// are preserved for alias resolution (same pattern as run-tui).
	const dashDashIndex = args.indexOf('--');
	let commanderArgs = args;
	let passthroughFromSeparator: string[] = [];

	if (dashDashIndex !== -1) {
		commanderArgs = args.slice(0, dashDashIndex);
		passthroughFromSeparator = args.slice(dashDashIndex + 1);
	}

	const program = new Command();

	program
		.name('run-ctx')
		.description(
			'Context-aware command alias CLI — run the right command based on cwd, files, and env vars',
		)
		.helpOption(false)
		.argument(
			'[args...]',
			'Alias name (dot-notation) followed by extra arguments',
		)
		.option('-h, --help', 'Show this help message')
		.option('-v, --version', 'Show version information')
		.option(
			'-l, --list',
			'List all aliases and matched commands for current context',
		)
		.option('--init', 'Bootstrap a new rich starter configuration')
		.option('--dry-run', 'Show what command would run without executing')
		.option('-e, --edit', 'Launch the TUI editor (run-ctx-editor)')
		.option(
			'--completions <shell>',
			'Generate shell completion script (bash, zsh, fish)',
		)
		.option('--shell', 'Run command in shell (allows pipe, redirect, &&)')
		.option('-V, --verbose', 'Show detailed rule evaluation logs')
		.allowExcessArguments(true)
		.action(
			(
				args: string[],
				options: {
					help?: boolean;
					version?: boolean;
					list?: boolean;
					init?: boolean;
					dryRun?: boolean;
					edit?: boolean;
					completions?: string;
					shell?: boolean;
					verbose?: boolean;
				},
			) => {
				// --help
				if (options.help) {
					printHelp(aliasNames);
					process.exitCode = 0;
					return;
				}

				// --version
				if (options.version) {
					console.log(printVersion());
					process.exitCode = 0;
					return;
				}

				// --list
				if (options.list) {
					printList(config);
					process.exitCode = 0;
					return;
				}

				// --completions <shell>
				if (options.completions !== undefined) {
					const shell = options.completions;
					if (!['bash', 'zsh', 'fish'].includes(shell)) {
						console.error('Usage: run-ctx --completions <bash|zsh|fish>');
						process.exitCode = 1;
						return;
					}
					console.log(
						// biome-ignore lint/suspicious/noExplicitAny: omelette types are incomplete
						(completion as any).generateCompletionCode(shell, 'run-ctx'),
					);
					process.exitCode = 0;
					return;
				}

				// --init
				if (options.init) {
					try {
						const finalPath = bootstrapStarterConfig();
						console.log(
							chalk.green('Successfully initialized run-ctx configuration!'),
						);
						console.log(`Created: ${chalk.cyan(finalPath)}`);
						console.log(
							`Run ${chalk.yellow('run-ctx --list')} to explore your new aliases.`,
						);
						process.exitCode = 0;
						return;
					} catch (err) {
						console.error(
							chalk.red(
								(err instanceof Error ? err.message : String(err)) ||
									'Failed to initialize config',
							),
						);
						console.error('If you want to start fresh, delete it first.');
						process.exitCode = 1;
						return;
					}
				}

				// --edit
				if (options.edit) {
					const editorPath = path.resolve(
						path.dirname(new URL(import.meta.url).pathname),
						'editor-cli.js',
					);
					try {
						execFileSync('node', [editorPath], { stdio: 'inherit' });
					} catch {
						try {
							execFileSync('run-ctx-editor', [], { stdio: 'inherit' });
						} catch {
							console.error('Could not launch run-ctx-editor.');
							process.exitCode = 1;
							return;
						}
					}
					process.exitCode = 0;
					return;
				}

				// --dry-run <alias>
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
					const match = findBestMatch(
						dryAlias.rules,
						process.cwd(),
						process.env,
						{
							verbose: options.verbose,
							aliasName,
						},
					);
					if (match) {
						console.log(match.command);
					} else if (dryAlias.fallback) {
						console.log(dryAlias.fallback);
					} else {
						console.error(
							`No matching rule for "${aliasName}" in this context.`,
						);
						process.exitCode = 1;
						return;
					}
					process.exitCode = 0;
					return;
				}

				// No positional args and no flag-based command → show help
				if (args.length === 0) {
					printHelp(aliasNames);
					process.exitCode = 0;
					return;
				}

				// Reconstruct the full args array for resolveAlias when '--' was used.
				// resolveAlias expects: [aliasTokens..., '--', passthroughArgs...]
				const resolverArgs =
					passthroughFromSeparator.length > 0
						? [...args, '--', ...passthroughFromSeparator]
						: args;

				// Try greedy dot-notation alias resolution
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
						console.error(
							`No matching rule for alias "${resolved.aliasName}" in this context.`,
						);
						console.error(`  cwd: ${cwd}`);
						console.error(`  rules checked: ${alias.rules.length}`);
						process.exitCode = 1;
						return;
					}
				}

				// Not a recognized alias or flag
				console.error(`Unknown alias or option: "${args[0]}"`);
				console.error('Run "run-ctx --help" for usage information.');
				process.exitCode = 1;
				return;
			},
		);

	program.parse(commanderArgs, { from: 'user' });
}

// Execute immediately when run as a script, but not when imported in vitest
let isMain = false;
try {
	if (process.argv[1]) {
		const scriptPath = fs.realpathSync(process.argv[1]);
		const currentFile = fileURLToPath(import.meta.url);
		isMain = scriptPath === currentFile;
	}
} catch {
	isMain = false;
}

if (isMain) {
	runCLI();
}
