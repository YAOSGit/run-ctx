import type React from 'react';
import { createContext, useContext } from 'react';
import { useUIState } from '../../hooks/useUIState/index.js';
import type { UseUIStateReturn } from '../../hooks/useUIState/index.js';

const UIStateContext = createContext<UseUIStateReturn | null>(null);

export const UIStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const uiState = useUIState();
	return (
		<UIStateContext.Provider value={uiState}>
			{children}
		</UIStateContext.Provider>
	);
};

export const useUIStateContext = (): UseUIStateReturn => {
	const ctx = useContext(UIStateContext);
	if (!ctx) throw new Error('useUIStateContext must be used within UIStateProvider');
	return ctx;
};
