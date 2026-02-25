import { useCallback, useEffect, useRef, useState } from 'react';
import type { Config } from '../../types/Config/index.js';
import { loadConfig, saveConfig } from '../../utils/config/index.js';

export const useConfig = () => {
	const [config, setConfig] = useState<Config>(() => loadConfig());

	const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const updateConfig = useCallback((newConfig: Config) => {
		setConfig(newConfig);

		if (saveTimeoutRef.current) {
			clearTimeout(saveTimeoutRef.current);
		}

		saveTimeoutRef.current = setTimeout(() => {
			saveConfig(newConfig);
		}, 500);
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
