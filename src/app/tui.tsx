#!/usr/bin/env node
import {
	createCLI,
	fatalError,
	formatError,
	getExitCode,
	runIfMain,
} from '@yaos-git/toolkit/cli';
import { render } from 'ink';
import { App } from './index.js';

declare const __CLI_VERSION__: string;

async function runTUI(args: string[] = process.argv.slice(2)): Promise<void> {
	const { program } = createCLI({
		name: 'run-ctx-tui',
		description: 'Interactive TUI for run-ctx alias management',
		version: __CLI_VERSION__,
	});

	program.action(() => {
		render(<App />);
	});

	try {
		await program.parseAsync(args, { from: 'user' });
	} catch (err) {
		if (err instanceof Error && 'exitCode' in err) {
			process.exitCode = getExitCode(err);
		} else {
			fatalError(formatError(err));
		}
	}
}

runIfMain(import.meta.url, () => {
	runTUI();
});
