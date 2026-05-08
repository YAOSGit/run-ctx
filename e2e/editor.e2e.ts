import * as pty from 'node-pty';
import { afterEach, describe, expect, it } from 'vitest';
import { PTYRunner } from './utils/index.js';

function canSpawnPTY(): boolean {
	try {
		const term = pty.spawn(process.execPath, ['--version'], {
			cols: 80,
			rows: 24,
		});
		term.kill();
		return true;
	} catch {
		return false;
	}
}

describe.skipIf(!canSpawnPTY())('TUI Editor', () => {
	let runner: PTYRunner;

	afterEach(async () => {
		await runner?.cleanup();
	});

	it('launches and shows the home screen', async () => {
		runner = new PTYRunner();
		await runner.start();
		await runner.waitForText('run-ctx editor');
		expect(runner.getOutput()).toContain('YAOSGit');
	});

	it('quits with q key', async () => {
		runner = new PTYRunner();
		await runner.start();
		await runner.waitForText('run-ctx editor');
		runner.write('q');
		const exitCode = await runner.waitForExit();
		expect(exitCode).toBe(0);
	});
});
