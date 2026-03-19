import { assertType, describe, expectTypeOf, it } from 'vitest';
import type { Screen } from './useNavigation.types.js';

describe('Screen', () => {
	it('accepts alias-list screen', () => {
		assertType<Screen>({ type: 'alias-list' });
	});

	it('accepts rule-editor screen with aliasName', () => {
		assertType<Screen>({ type: 'rule-editor', aliasName: 'dev' });
	});

	it('accepts rule-detail screen with aliasName and ruleIndex', () => {
		assertType<Screen>({ type: 'rule-detail', aliasName: 'dev', ruleIndex: 0 });
	});

	it('rejects unknown screen type', () => {
		// @ts-expect-error - 'settings' is not a valid screen type
		assertType<Screen>({ type: 'settings' });
	});

	it('rule-editor requires aliasName', () => {
		// @ts-expect-error - missing aliasName for rule-editor
		assertType<Screen>({ type: 'rule-editor' });
	});

	it('rule-detail requires both aliasName and ruleIndex', () => {
		// @ts-expect-error - missing ruleIndex for rule-detail
		assertType<Screen>({ type: 'rule-detail', aliasName: 'dev' });
	});

	it('is a discriminated union on type', () => {
		expectTypeOf<Screen>().toMatchTypeOf<{ type: string }>();
	});
});
