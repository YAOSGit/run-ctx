import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useNavigation } from './index.js';

describe('useNavigation', () => {
	it('starts at alias-list screen', () => {
		const { result } = renderHook(() => useNavigation());
		expect(result.current.screen).toEqual({ type: 'alias-list' });
	});

	it('navigates to rule-editor', () => {
		const { result } = renderHook(() => useNavigation());

		act(() => {
			result.current.navigateTo({ type: 'rule-editor', aliasName: 'dev' });
		});

		expect(result.current.screen).toEqual({
			type: 'rule-editor',
			aliasName: 'dev',
		});
	});

	it('goBack from rule-detail returns to rule-editor', () => {
		const { result } = renderHook(() => useNavigation());

		act(() => {
			result.current.navigateTo({
				type: 'rule-detail',
				aliasName: 'dev',
				ruleIndex: 0,
			});
		});
		act(() => {
			result.current.goBack();
		});

		expect(result.current.screen).toEqual({
			type: 'rule-editor',
			aliasName: 'dev',
		});
	});

	it('goBack from rule-editor returns to alias-list', () => {
		const { result } = renderHook(() => useNavigation());

		act(() => {
			result.current.navigateTo({ type: 'rule-editor', aliasName: 'dev' });
		});
		act(() => {
			result.current.goBack();
		});

		expect(result.current.screen).toEqual({ type: 'alias-list' });
	});
});
