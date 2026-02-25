import { assertType, describe, expectTypeOf, it } from 'vitest';
import type { MatchCondition, Rule } from './index.js';

describe('Rule type tests', () => {
	it('Rule requires match and command', () => {
		expectTypeOf<Rule>().toHaveProperty('match');
		expectTypeOf<Rule>().toHaveProperty('command');
	});

	it('accepts minimal rule', () => {
		assertType<Rule>({ match: {}, command: 'echo hi' });
	});

	it('rejects rule without command', () => {
		// @ts-expect-error - command is required
		assertType<Rule>({ match: {} });
	});
});

describe('MatchCondition type tests', () => {
	it('all fields are optional', () => {
		assertType<MatchCondition>({});
	});

	it('file accepts string or string[]', () => {
		assertType<MatchCondition>({ file: 'package.json' });
		assertType<MatchCondition>({ file: ['package.json', '*.ts'] });
	});

	it('cwd accepts string or string[]', () => {
		assertType<MatchCondition>({ cwd: 'frontend' });
		assertType<MatchCondition>({ cwd: ['frontend', 'api'] });
	});

	it('env accepts string or string[]', () => {
		assertType<MatchCondition>({ env: 'CI' });
		assertType<MatchCondition>({ env: ['CI', 'DOCKER'] });
	});

	it('rejects invalid field types', () => {
		// @ts-expect-error - number is not valid for file
		assertType<MatchCondition>({ file: 123 });
	});
});
