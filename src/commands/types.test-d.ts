import { describe, expectTypeOf, it } from 'vitest';
import type { RunCtxCommand, RunCtxDeps } from './types.js';

describe('RunCtxDeps', () => {
	it('has ui property', () => {
		expectTypeOf<RunCtxDeps>().toHaveProperty('ui');
	});

	it('has screen property', () => {
		expectTypeOf<RunCtxDeps>().toHaveProperty('screen');
	});

	it('has goBack function', () => {
		expectTypeOf<RunCtxDeps>().toHaveProperty('goBack');
		expectTypeOf<RunCtxDeps['goBack']>().toBeFunction();
		expectTypeOf<RunCtxDeps['goBack']>().returns.toBeVoid();
	});

	it('inherits onQuit from BaseDeps', () => {
		expectTypeOf<RunCtxDeps>().toHaveProperty('onQuit');
	});
});

describe('RunCtxCommand', () => {
	it('has id property', () => {
		expectTypeOf<RunCtxCommand>().toHaveProperty('id');
	});

	it('has execute function', () => {
		expectTypeOf<RunCtxCommand>().toHaveProperty('execute');
	});

	it('has keys property', () => {
		expectTypeOf<RunCtxCommand>().toHaveProperty('keys');
	});
});
