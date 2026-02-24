#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadConfig } from '../utils/config/index.js';
import { execute } from '../utils/executor/index.js';
import { findBestMatch } from '../utils/matcher/index.js';
import { resolveAlias } from '../utils/resolver/index.js';

declare const __CLI_VERSION__: string;

function printVersion(): void {
	console.log(`run-ctx v${__CLI_VERSION__}`);
	console.log(`Node.js ${process.version}`);
	console.log(`Platform: ${process.platform} ${process.arch}`);
}

function printHelp(aliasNames: string[]): void {
	console.log('Usage: run-ctx <alias> [args...]');
	console.log('       run-ctx --list');
	console.log('       run-ctx --dry-run <alias>');
	console.log('       run-ctx --edit');
	console.log('');
	console.log('Options:');
	console.log(
		'  --list       List all aliases and matched commands for current context',
	);
	console.log('  --dry-run    Show what command would run without executing');
	console.log('  --edit       Launch the TUI editor (run-ctx-editor)');
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
		const desc = alias.description ? ` — ${alias.description}` : '';
		if (match) {
			console.log(`  ${name}${desc}`);
			console.log(`    → ${match.command} (score: ${match.score})`);
		} else if (alias.fallback) {
			console.log(`  ${name}${desc}`);
			console.log(`    → ${alias.fallback} (fallback)`);
		} else {
			console.log(`  ${name}${desc}`);
			console.log('    → (no match)');
		}
	}
}

function main(): void {
	const args = process.argv.slice(2);
	const config = loadConfig();
	const aliasNames = Object.keys(config.aliases);

	// No args → show help
	if (args.length === 0) {
		printHelp(aliasNames);
		process.exit(0);
	}

	const firstArg = args[0];

	// Try greedy dot-notation resolution: foo.bar.baz → foo.bar → foo
	const resolved = resolveAlias(config.aliases, args);
	if (resolved) {
		const { alias, passthroughArgs } = resolved;
		const cwd = process.cwd();
		const match = findBestMatch(alias.rules, cwd, process.env);

		if (match) {
			const exitCode = execute(match.command, passthroughArgs);
			process.exit(exitCode);
		} else if (alias.fallback) {
			const exitCode = execute(alias.fallback, passthroughArgs);
			process.exit(exitCode);
		} else {
			console.error(
				`No matching rule for alias "${resolved.aliasName}" in this context.`,
			);
			console.error(`  cwd: ${cwd}`);
			console.error(`  rules checked: ${alias.rules.length}`);
			process.exit(1);
		}
		return;
	}

	// Not an alias → process as flags
	switch (firstArg) {
		case '--version':
		case '-v':
			printVersion();
			break;

		case '--help':
		case '-h':
			printHelp(aliasNames);
			break;

		case '--list':
		case '-l':
			printList(config);
			break;

		case '--dry-run': {
			const aliasName = args[1];
			if (!aliasName) {
				console.error('Usage: run-ctx --dry-run <alias>');
				process.exit(1);
			}
			const dryAlias = config.aliases[aliasName];
			if (!dryAlias) {
				console.error(`Unknown alias: "${aliasName}"`);
				process.exit(1);
			}
			const match = findBestMatch(dryAlias.rules, process.cwd(), process.env);
			if (match) {
				console.log(match.command);
			} else if (dryAlias.fallback) {
				console.log(dryAlias.fallback);
			} else {
				console.error(`No matching rule for "${aliasName}" in this context.`);
				process.exit(1);
			}
			break;
		}

		case '--edit':
		case '-e': {
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
					process.exit(1);
				}
			}
			break;
		}

		default:
			console.error(`Unknown alias or option: "${firstArg}"`);
			console.error('Run "run-ctx --help" for usage information.');
			process.exit(1);
	}
}

main();
