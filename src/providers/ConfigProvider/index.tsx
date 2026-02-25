import type React from 'react';
import { createContext, useContext, useMemo } from 'react';
import { useConfig as useConfigHook } from '../../hooks/useConfig/index.js';
import type {
	ConfigContextValue,
	ConfigProviderProps,
} from './ConfigProvider.types.js';

const ConfigContext = createContext<ConfigContextValue | null>(null);

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
	const configState = useConfigHook();

	const value: ConfigContextValue = useMemo(
		() => ({
			config: configState.config,
			updateConfig: configState.updateConfig,
		}),
		[configState.config, configState.updateConfig],
	);

	return (
		<ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
	);
};

export const useConfig = (): ConfigContextValue => {
	const context = useContext(ConfigContext);
	if (!context) {
		throw new Error('useConfig must be used within a ConfigProvider');
	}
	return context;
};
