import type React from 'react';
import type { Config } from '../../types/Config/index.js';

export interface ConfigProviderProps {
	children: React.ReactNode;
}

export interface ConfigContextValue {
	config: Config;
	updateConfig: (newConfig: Config) => void;
}
