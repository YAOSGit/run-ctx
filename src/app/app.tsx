import { useState } from 'react';
import AliasList from '../components/AliasList/index.js';
import RuleDetail from '../components/RuleDetail/index.js';
import RuleEditor from '../components/RuleEditor/index.js';
import type { Config } from '../types/Config/index.js';
import { loadConfig, saveConfig } from '../utils/config/index.js';

type Screen =
	| { type: 'alias-list' }
	| { type: 'rule-editor'; aliasName: string }
	| { type: 'rule-detail'; aliasName: string; ruleIndex: number };

export default function App() {
	const [config, setConfig] = useState<Config>(() => loadConfig());
	const [screen, setScreen] = useState<Screen>({ type: 'alias-list' });

	const handleSave = (newConfig: Config) => {
		setConfig(newConfig);
		saveConfig(newConfig);
	};

	switch (screen.type) {
		case 'alias-list':
			return (
				<AliasList
					config={config}
					onSave={handleSave}
					onEditAlias={(name) =>
						setScreen({ type: 'rule-editor', aliasName: name })
					}
				/>
			);

		case 'rule-editor': {
			const alias = config.aliases[screen.aliasName];
			if (!alias) {
				setScreen({ type: 'alias-list' });
				return null;
			}
			return (
				<RuleEditor
					aliasName={screen.aliasName}
					alias={alias}
					onSave={(updatedAlias) => {
						handleSave({
							...config,
							aliases: {
								...config.aliases,
								[screen.aliasName]: updatedAlias,
							},
						});
					}}
					onBack={() => setScreen({ type: 'alias-list' })}
					onEditRule={(index) =>
						setScreen({
							type: 'rule-detail',
							aliasName: screen.aliasName,
							ruleIndex: index,
						})
					}
				/>
			);
		}

		case 'rule-detail': {
			const detailAlias = config.aliases[screen.aliasName];
			const rule = detailAlias?.rules[screen.ruleIndex];
			if (!detailAlias || !rule) {
				setScreen({ type: 'alias-list' });
				return null;
			}
			return (
				<RuleDetail
					rule={rule}
					onSave={(updatedRule) => {
						const newRules = [...detailAlias.rules];
						newRules[screen.ruleIndex] = updatedRule;
						handleSave({
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
					onBack={() =>
						setScreen({
							type: 'rule-editor',
							aliasName: screen.aliasName,
						})
					}
				/>
			);
		}
	}
}
