import { describe, expectTypeOf, it } from 'vitest';
import { FIELDS } from './RuleDetail.consts.js';
import type { FieldConfig } from './RuleDetail.types.js';

describe('RuleDetail constants', () => {
	it('FIELDS should be an array of FieldConfig', () => {
		expectTypeOf(FIELDS).toEqualTypeOf<FieldConfig[]>();
	});
});
