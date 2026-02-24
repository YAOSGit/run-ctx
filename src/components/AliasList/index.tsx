import { Box, Text, useApp, useInput } from 'ink';
import { useState } from 'react';
import type { Config } from '../../types/Config/index.js';
import { COLOR } from '../../types/Color/index.js';

type Props = {
	config: Config;
	onSave: (config: Config) => void;
	onEditAlias: (name: string) => void;
};

export default function AliasList({ config, onSave, onEditAlias }: Props) {
	const { exit } = useApp();
	const aliasNames = Object.keys(config.aliases);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState('');

	useInput((input, key) => {
		if (isCreating) {
			if (key.return) {
				if (newName.trim()) {
					const newConfig = {
						...config,
						aliases: {
							...config.aliases,
							[newName.trim()]: { rules: [] },
						},
					};
					onSave(newConfig);
				}
				setIsCreating(false);
				setNewName('');
			} else if (key.escape) {
				setIsCreating(false);
				setNewName('');
			} else if (key.backspace || key.delete) {
				setNewName((prev) => prev.slice(0, -1));
			} else if (input && !key.ctrl && !key.meta) {
				setNewName((prev) => prev + input);
			}
			return;
		}

		if (key.upArrow) {
			setSelectedIndex((prev) => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex((prev) => Math.min(aliasNames.length - 1, prev + 1));
		} else if (key.return && aliasNames.length > 0) {
			onEditAlias(aliasNames[selectedIndex]);
		} else if (input === 'n') {
			setIsCreating(true);
		} else if (input === 'd' && aliasNames.length > 0) {
			const nameToDelete = aliasNames[selectedIndex];
			const { [nameToDelete]: _, ...rest } = config.aliases;
			onSave({ ...config, aliases: rest });
			setSelectedIndex((prev) => Math.min(prev, aliasNames.length - 2));
		} else if (input === 'q' || key.escape) {
			exit();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color={COLOR.CYAN}>
					run-ctx editor
				</Text>
				<Text dimColor> — Manage your command aliases</Text>
			</Box>

			{aliasNames.length === 0 ? (
				<Text dimColor>
					No aliases configured. Press 'n' to create one.
				</Text>
			) : (
				aliasNames.map((name, index) => {
					const alias = config.aliases[name];
					const ruleCount = alias.rules.length;
					const isSelected = index === selectedIndex;

					return (
						<Box key={name}>
							<Text color={isSelected ? COLOR.CYAN : undefined}>
								{isSelected ? '> ' : '  '}
								<Text bold>{name}</Text>
								{alias.description ? (
									<Text dimColor> — {alias.description}</Text>
								) : null}
								<Text color={COLOR.YELLOW}>
									{' '}
									({ruleCount} rule{ruleCount !== 1 ? 's' : ''})
								</Text>
							</Text>
						</Box>
					);
				})
			)}

			{isCreating ? (
				<Box marginTop={1}>
					<Text color={COLOR.GREEN}>New alias name: </Text>
					<Text>{newName}</Text>
					<Text dimColor>|</Text>
				</Box>
			) : null}

			<Box marginTop={1} borderStyle="round" borderColor={COLOR.GRAY} paddingX={1}>
				<Text wrap="end">
					<Text bold color={COLOR.MAGENTA}>
						YAOSGit
						<Text dimColor> : </Text>
						ctx
					</Text>
					<Text dimColor> │ </Text>
					<Text bold>↑↓</Text> navigate
					<Text dimColor> │ </Text>
					<Text bold>Enter</Text> edit
					<Text dimColor> │ </Text>
					<Text bold>n</Text> new
					<Text dimColor> │ </Text>
					<Text bold>d</Text> delete
					<Text dimColor> │ </Text>
					<Text bold>q</Text> quit
				</Text>
			</Box>
		</Box>
	);
}
