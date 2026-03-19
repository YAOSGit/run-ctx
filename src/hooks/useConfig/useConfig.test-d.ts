import { describe, expectTypeOf, it } from 'vitest';
import { SAVE_DEBOUNCE_MS } from './useConfig.consts.js';

describe('useConfig constants', () => {
	it('SAVE_DEBOUNCE_MS should be a number', () => {
		expectTypeOf(SAVE_DEBOUNCE_MS).toBeNumber();
	});
});
