import { useCallback, useEffect, useRef, useState } from 'react';
import type { Config } from '../../types/Config/index.js';
import { loadConfig, saveConfig } from '../../utils/config/index.js';
import { SAVE_DEBOUNCE_MS } from './useConfig.consts.js';

export const useConfigLoader = () => {
	const [config, setConfig] = useState<Config>(() => loadConfig());

	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const updateConfig = useCallback((newConfig: Config) => {
		setConfig(newConfig);

		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(() => {
			saveConfig(newConfig);
		}, SAVE_DEBOUNCE_MS);
	}, []);

	useEffect(() => {
		return () => {
			if (saveTimeoutRef.current) {
				clearTimeout(saveTimeoutRef.current);
			}
		};
	}, []);

	return { config, updateConfig };
};
