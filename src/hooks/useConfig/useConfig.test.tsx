import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../utils/config/index.js', () => ({
	loadConfig: vi.fn(() => ({ version: 1, aliases: {} })),
	saveConfig: vi.fn(),
}));

import { loadConfig, saveConfig } from '../../utils/config/index.js';
import { useConfigLoader } from './index.js';

describe('useConfig', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('initializes with loaded config', () => {
		const mockConfig = { aliases: { dev: { rules: [] } } };
		vi.mocked(loadConfig).mockReturnValue(mockConfig);

		const { result } = renderHook(() => useConfigLoader());
		expect(result.current.config).toEqual(mockConfig);
	});

	it('saves config and updates state', () => {
		const { result } = renderHook(() => useConfigLoader());
		const newConfig = { aliases: { test: { rules: [] } } };

		act(() => {
			result.current.updateConfig(
				newConfig as unknown as Parameters<
					typeof result.current.updateConfig
				>[0],
			);
			vi.advanceTimersByTime(500);
		});

		expect(result.current.config).toEqual(newConfig);
		expect(saveConfig).toHaveBeenCalledWith(newConfig);
	});
});
