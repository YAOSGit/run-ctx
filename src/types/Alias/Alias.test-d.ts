import { assertType, describe, expectTypeOf, it } from 'vitest';
import type { Alias } from './index.js';

describe('Alias type tests', () => {
	it('Alias requires rules array', () => {
		expectTypeOf<Alias>().toHaveProperty('rules');
	});

	it('description is optional', () => {
		assertType<Alias>({ rules: [] });
		assertType<Alias>({ description: 'My alias', rules: [] });
	});

	it('fallback is optional', () => {
		assertType<Alias>({ rules: [] });
		assertType<Alias>({ rules: [], fallback: 'echo hi' });
		assertType<Alias>({ rules: [], fallback: undefined });
	});

	it('rejects alias without rules', () => {
		// @ts-expect-error - rules is required
		assertType<Alias>({});
	});
});
