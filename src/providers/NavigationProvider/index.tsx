import type React from 'react';
import { createContext, useContext, useMemo } from 'react';
import { useNavigation as useNavigationHook } from '../../hooks/useNavigation/index.js';
import type {
	NavigationContextValue,
	NavigationProviderProps,
} from './NavigationProvider.types.js';

const NavigationContext = createContext<NavigationContextValue | null>(null);

export const NavigationProvider: React.FC<NavigationProviderProps> = ({
	children,
}) => {
	const navState = useNavigationHook();

	const value: NavigationContextValue = useMemo(
		() => ({
			screen: navState.screen,
			navigateTo: navState.navigateTo,
			goBack: navState.goBack,
		}),
		[navState],
	);

	return (
		<NavigationContext.Provider value={value}>
			{children}
		</NavigationContext.Provider>
	);
};

export const useNavigation = (): NavigationContextValue => {
	const context = useContext(NavigationContext);
	if (!context) {
		throw new Error('useNavigation must be used within a NavigationProvider');
	}
	return context;
};
