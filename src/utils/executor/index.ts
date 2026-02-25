import { spawnSync } from 'node:child_process';
import os from 'node:os';

export type ParsedCommand = {
	program: string;
	args: string[];
};

export function parseCommand(command: string): ParsedCommand {
	const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
	const parts: string[] = [];
	let match: RegExpExecArray | null;

	while (true) {
		match = regex.exec(command);
		if (match === null) break;
		// match[1] refers to double quotes, match[2] refers to single quotes, match[0] is unquoted
		parts.push(match[1] || match[2] || match[0]);
	}

	if (parts.length === 0) {
		return { program: '', args: [] };
	}

	return {
		program: parts[0],
		args: parts.slice(1),
	};
}

export function buildCommandArgs(
	command: string,
	passthroughArgs: string[],
): ParsedCommand {
	const parsed = parseCommand(command);
	return {
		program: parsed.program,
		args: [...parsed.args, ...passthroughArgs],
	};
}

export function execute(
	command: string,
	passthroughArgs: string[],
	options?: { shell?: boolean },
): number {
	const isShell = options?.shell ?? false;

	let program: string;
	let args: string[];

	if (isShell) {
		const escapedPassthrough = passthroughArgs.map((a) =>
			a.includes(' ') || a.includes('"') || a.includes("'")
				? `"${a.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/'/g, "\\'")}"`
				: a,
		);
		program = [command, ...escapedPassthrough].join(' ');
		args = [];
	} else {
		const parsed = buildCommandArgs(command, passthroughArgs);
		program = parsed.program;
		args = parsed.args;
	}

	const result = spawnSync(program, args, {
		stdio: 'inherit',
		env: process.env,
		cwd: process.cwd(),
		shell: isShell,
	});

	if (result.error) {
		console.error(`Failed to execute: ${command}`);
		console.error(result.error.message);
		return 1;
	}

	if (result.signal) {
		const sigNum = os.constants.signals[result.signal];
		return 128 + (sigNum ?? 0);
	}

	return result.status ?? 1;
}
