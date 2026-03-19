import { describe, expectTypeOf, it } from 'vitest';
import type { Screen } from '../../hooks/useNavigation/index.js';
import type { NavigationContextValue, NavigationProviderProps } from './NavigationProvider.types.js';

describe('NavigationProviderProps', () => {
	it('has children property', () => {
		expectTypeOf<NavigationProviderProps>().toHaveProperty('children');
	});
});

describe('NavigationContextValue', () => {
	it('has screen, navigateTo, and goBack properties', () => {
		expectTypeOf<NavigationContextValue>().toHaveProperty('screen');
		expectTypeOf<NavigationContextValue>().toHaveProperty('navigateTo');
		expectTypeOf<NavigationContextValue>().toHaveProperty('goBack');
	});

	it('screen is of type Screen', () => {
		expectTypeOf<NavigationContextValue['screen']>().toEqualTypeOf<Screen>();
	});

	it('navigateTo accepts a Screen and returns void', () => {
		expectTypeOf<NavigationContextValue['navigateTo']>().toBeFunction();
		expectTypeOf<NavigationContextValue['navigateTo']>().parameter(0).toEqualTypeOf<Screen>();
		expectTypeOf<NavigationContextValue['navigateTo']>().returns.toBeVoid();
	});

	it('goBack returns void', () => {
		expectTypeOf<NavigationContextValue['goBack']>().toBeFunction();
		expectTypeOf<NavigationContextValue['goBack']>().returns.toBeVoid();
	});
});
