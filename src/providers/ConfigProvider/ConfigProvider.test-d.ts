import { assertType, describe, expectTypeOf, it } from 'vitest';
import type { ConfigContextValue, ConfigProviderProps } from './ConfigProvider.types.js';

describe('ConfigProviderProps', () => {
	it('has children property', () => {
		expectTypeOf<ConfigProviderProps>().toHaveProperty('children');
	});

	it('rejects missing children', () => {
		// @ts-expect-error - missing required children
		assertType<ConfigProviderProps>({});
	});
});

describe('ConfigContextValue', () => {
	it('has config and updateConfig properties', () => {
		expectTypeOf<ConfigContextValue>().toHaveProperty('config');
		expectTypeOf<ConfigContextValue>().toHaveProperty('updateConfig');
	});

	it('updateConfig is a function accepting Config and returning void', () => {
		expectTypeOf<ConfigContextValue['updateConfig']>().toBeFunction();
		expectTypeOf<ConfigContextValue['updateConfig']>().returns.toBeVoid();
	});
});
