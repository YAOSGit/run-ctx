import { useEffect } from 'react';
import { AliasList } from '../components/AliasList/index.js';
import { RuleDetail } from '../components/RuleDetail/index.js';
import { RuleEditor } from '../components/RuleEditor/index.js';
import { useConfig } from '../providers/ConfigProvider/index.js';
import { useNavigation } from '../providers/NavigationProvider/index.js';

export function AppContent() {
	const { config, updateConfig } = useConfig();
	const { screen, navigateTo, goBack } = useNavigation();

	// Check if current screen is valid, if not fall back to list
	useEffect(() => {
		if (screen.type === 'rule-editor') {
			const alias = config.aliases[screen.aliasName];
			if (!alias) navigateTo({ type: 'alias-list' });
		} else if (screen.type === 'rule-detail') {
			const detailAlias = config.aliases[screen.aliasName];
			const rule = detailAlias?.rules[screen.ruleIndex];
			if (!detailAlias || !rule) navigateTo({ type: 'alias-list' });
		}
	}, [screen, config.aliases, navigateTo]);

	switch (screen.type) {
		case 'alias-list':
			return (
				<AliasList
					config={config}
					onSave={updateConfig}
					onEditAlias={(name) =>
						navigateTo({ type: 'rule-editor', aliasName: name })
					}
				/>
			);

		case 'rule-editor': {
			const alias = config.aliases[screen.aliasName];

			if (!alias) {
				return null;
			}
			return (
				<RuleEditor
					aliasName={screen.aliasName}
					alias={alias}
					onSave={(updatedAlias) => {
						updateConfig({
							...config,
							aliases: {
								...config.aliases,
								[screen.aliasName]: updatedAlias,
							},
						});
					}}
					onBack={goBack}
					onEditRule={(index) =>
						navigateTo({
							type: 'rule-detail',
							aliasName: screen.aliasName,
							ruleIndex: index,
						})
					}
					onRename={(oldName, newName) => {
						const renamedAlias = config.aliases[oldName];
						if (renamedAlias) {
							const newAliases: typeof config.aliases = {};
							for (const key of Object.keys(config.aliases)) {
								if (key === oldName) {
									newAliases[newName] = renamedAlias;
								} else {
									const existing = config.aliases[key];
									if (existing) newAliases[key] = existing;
								}
							}
							updateConfig({
								...config,
								aliases: newAliases,
							});
							navigateTo({ type: 'rule-editor', aliasName: newName });
						}
					}}
				/>
			);
		}

		case 'rule-detail': {
			const detailAlias = config.aliases[screen.aliasName];
			const rule = detailAlias?.rules[screen.ruleIndex];

			if (!detailAlias || !rule) {
				return null;
			}
			return (
				<RuleDetail
					rule={rule}
					onSave={(updatedRule) => {
						const newRules = [...detailAlias.rules];
						newRules[screen.ruleIndex] = updatedRule;
						updateConfig({
							...config,
							aliases: {
								...config.aliases,
								[screen.aliasName]: {
									...detailAlias,
									rules: newRules,
								},
							},
						});
					}}
					onBack={goBack}
				/>
			);
		}
	}
}
