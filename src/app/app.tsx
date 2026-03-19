import { Box, Text, useApp } from 'ink';
import { useCallback, useEffect, useMemo } from 'react';
import { TUILayout } from '@yaos-git/toolkit/tui/components';
import { COMMANDS, CommandsProvider } from '../commands/index.js';
import type { RunCtxDeps } from '../commands/types.js';
import { AliasList } from '../components/AliasList/index.js';
import { RuleDetail } from '../components/RuleDetail/index.js';
import { RuleEditor } from '../components/RuleEditor/index.js';
import { useConfig } from '../providers/ConfigProvider/index.js';
import { useNavigation } from '../providers/NavigationProvider/index.js';
import { useUIStateContext } from '../providers/UIStateProvider/index.js';
import { theme } from '../theme.js';

const HELP_SECTION_COLORS: Record<string, string> = {
	Navigation: 'cyan',
	General: 'white',
};

function BreadcrumbHeader({ screen }: { screen: RunCtxDeps['screen'] }) {
	const crumbs: { label: string; color?: string }[] = [
		{ label: 'run-ctx editor', color: theme.brand },
	];

	switch (screen.type) {
		case 'alias-list':
			crumbs.push({ label: 'Aliases' });
			break;
		case 'rule-editor':
			crumbs.push({ label: screen.aliasName });
			crumbs.push({ label: 'Rules' });
			break;
		case 'rule-detail':
			crumbs.push({ label: screen.aliasName });
			crumbs.push({ label: `Rule #${screen.ruleIndex + 1}` });
			break;
	}

	return (
		<Box width="100%" borderStyle="round" borderColor="gray" paddingX={1}>
			<Text wrap="truncate">
				{crumbs.map((crumb, i) => (
					<Text key={crumb.label}>
						{i > 0 && <Text dimColor> › </Text>}
						<Text color={crumb.color}>{crumb.label}</Text>
					</Text>
				))}
			</Text>
		</Box>
	);
}

export function AppContent() {
	const { exit } = useApp();
	const ui = useUIStateContext();
	const { config, updateConfig } = useConfig();
	const { screen, navigateTo, goBack } = useNavigation();

	const onQuit = useCallback(() => exit(), [exit]);
	const deps: RunCtxDeps = useMemo(
		() => ({ ui, onQuit, screen, goBack }),
		[ui, onQuit, screen, goBack],
	);

	// Guard: if current screen references a deleted alias, fall back to list
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

	const headerElement = <BreadcrumbHeader screen={screen} />;

	let content: React.ReactNode = null;

	switch (screen.type) {
		case 'alias-list':
			content = (
				<AliasList
					config={config}
					onSave={updateConfig}
					onEditAlias={(name) => navigateTo({ type: 'rule-editor', aliasName: name })}
				/>
			);
			break;

		case 'rule-editor': {
			const alias = config.aliases[screen.aliasName];
			if (alias) {
				content = (
					<RuleEditor
						aliasName={screen.aliasName}
						alias={alias}
						onSave={(updatedAlias) =>
							updateConfig({
								...config,
								aliases: { ...config.aliases, [screen.aliasName]: updatedAlias },
							})
						}
						onBack={goBack}
						onEditRule={(index) =>
							navigateTo({ type: 'rule-detail', aliasName: screen.aliasName, ruleIndex: index })
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
								updateConfig({ ...config, aliases: newAliases });
								navigateTo({ type: 'rule-editor', aliasName: newName });
							}
						}}
					/>
				);
			}
			break;
		}

		case 'rule-detail': {
			const detailAlias = config.aliases[screen.aliasName];
			const rule = detailAlias?.rules[screen.ruleIndex];
			if (detailAlias && rule) {
				content = (
					<RuleDetail
						rule={rule}
						onSave={(updatedRule) => {
							const newRules = [...detailAlias.rules];
							newRules[screen.ruleIndex] = updatedRule;
							updateConfig({
								...config,
								aliases: {
									...config.aliases,
									[screen.aliasName]: { ...detailAlias, rules: newRules },
								},
							});
						}}
						onBack={goBack}
					/>
				);
			}
			break;
		}
	}

	return (
		<CommandsProvider deps={deps}>
			<TUILayout
				brand="run-ctx"
				theme={theme}
				commands={COMMANDS}
				deps={deps}
				helpTitle="run-ctx — Keyboard Shortcuts"
				helpSectionColors={HELP_SECTION_COLORS}
				header={headerElement}
			>
				{content}
			</TUILayout>
		</CommandsProvider>
	);
}
