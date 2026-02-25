import type React from 'react';
import { ConfigProvider } from '../providers/ConfigProvider/index.js';
import { NavigationProvider } from '../providers/NavigationProvider/index.js';

export interface AppProvidersProps {
	children: React.ReactNode;
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
	return (
		<ConfigProvider>
			<NavigationProvider>{children}</NavigationProvider>
		</ConfigProvider>
	);
};
