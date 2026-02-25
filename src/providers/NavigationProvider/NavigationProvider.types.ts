import type React from 'react';
import type { Screen } from '../../hooks/useNavigation/index.js';

export interface NavigationProviderProps {
	children: React.ReactNode;
}

export interface NavigationContextValue {
	screen: Screen;
	navigateTo: (target: Screen) => void;
	goBack: () => void;
}
