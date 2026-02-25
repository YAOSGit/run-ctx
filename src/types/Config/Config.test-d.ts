import { assertType, describe, expectTypeOf, it } from 'vitest';
import type { Config } from './index.js';

describe('Config type tests', () => {
	it('Config has aliases record', () => {
		expectTypeOf<Config>().toHaveProperty('aliases');
	});

	it('accepts valid config', () => {
		assertType<Config>({
			aliases: {
				dev: { rules: [] },
			},
		});
	});

	it('accepts config with full alias', () => {
		assertType<Config>({
			aliases: {
				dev: {
					description: 'Start dev server',
					rules: [{ match: { file: 'package.json' }, command: 'npm run dev' }],
					fallback: 'echo no match',
				},
			},
		});
	});

	it('accepts empty aliases and version', () => {
		assertType<Config>({ version: 1, aliases: {} });
	});
});
