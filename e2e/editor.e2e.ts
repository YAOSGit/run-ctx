import { afterEach, describe, expect, it } from 'vitest';
import { PTYRunner } from './utils/index.js';

describe('TUI Editor', () => {
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
