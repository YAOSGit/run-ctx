import { describe, expectTypeOf, it } from 'vitest';
import type { Config } from '../../types/Config/index.js';
import { INITIAL_CONFIG } from './initialConfig.consts.js';

describe('initialConfig constants', () => {
	it('INITIAL_CONFIG should satisfy Config', () => {
		expectTypeOf(INITIAL_CONFIG).toMatchTypeOf<Config>();
	});
});
