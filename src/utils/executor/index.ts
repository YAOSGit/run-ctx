import { spawnSync } from 'node:child_process';

export type ParsedCommand = {
	program: string;
	args: string[];
};

export function parseCommand(command: string): ParsedCommand {
	const parts = command.trim().split(/\s+/);
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

export function execute(command: string, passthroughArgs: string[]): number {
	const { program, args } = buildCommandArgs(command, passthroughArgs);
	const result = spawnSync(program, args, {
		stdio: 'inherit',
		env: process.env,
		cwd: process.cwd(),
	});

	if (result.error) {
		console.error(`Failed to execute: ${command}`);
		console.error(result.error.message);
		return 1;
	}

	return result.status ?? 1;
}
