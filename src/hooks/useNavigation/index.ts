import { useCallback, useState } from 'react';

export type Screen =
	| { type: 'alias-list' }
	| { type: 'rule-editor'; aliasName: string }
	| { type: 'rule-detail'; aliasName: string; ruleIndex: number };

export const useNavigation = () => {
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
