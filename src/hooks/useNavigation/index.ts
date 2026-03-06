import { useCallback, useState } from 'react';
import type { Screen } from './useNavigation.types.js';

export type { Screen };

export const useNavigationState = () => {
	const [screen, setScreen] = useState<Screen>({ type: 'alias-list' });

	const navigateTo = useCallback((target: Screen) => {
		setScreen(target);
	}, []);

	const goBack = useCallback(() => {
		setScreen((current) => {
			switch (current.type) {
				case 'rule-detail':
					return { type: 'rule-editor', aliasName: current.aliasName };
				case 'rule-editor':
					return { type: 'alias-list' };
				default:
					return { type: 'alias-list' };
			}
		});
	}, []);

	return { screen, navigateTo, goBack };
};
