import { Box, Text, useApp, useInput } from 'ink';
import { useState } from 'react';
import { COLOR } from '../../types/Color/index.js';
import { StatusBar } from '../StatusBar/index.js';
import type { AliasListProps } from './AliasList.types.js';

export function AliasList({ config, onSave, onEditAlias }: AliasListProps) {
	const { exit } = useApp();

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState('');
	const [error, setError] = useState<string | null>(null);

	const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
	const [isSearching, setIsSearching] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const aliasNames = Object.keys(config.aliases).filter((name) =>
		name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	useInput((input, key) => {
		if (isCreating) {
			if (key.return) {
				const trimmed = newName.trim();
				if (trimmed) {
					if (trimmed.startsWith('-')) {
						setError('Alias names cannot start with a dash (-)');
						return;
					}
					const newConfig = {
						...config,
						aliases: {
							...config.aliases,
							[trimmed]: { rules: [] },
						},
					};
					onSave(newConfig);
				}
				setIsCreating(false);
				setNewName('');
				setError(null);
			} else if (key.escape) {
				setIsCreating(false);
				setNewName('');
				setError(null);
			} else if (key.backspace || key.delete) {
				setNewName((prev) => prev.slice(0, -1));
				setError(null);
			} else if (input && !key.ctrl && !key.meta) {
				setNewName((prev) => prev + input);
				setError(null);
			}
			return;
		}

		if (isSearching) {
			if (key.return || key.escape) {
				setIsSearching(false);
			} else if (key.backspace || key.delete) {
				setSearchQuery((prev) => prev.slice(0, -1));
				setSelectedIndex(0);
			} else if (input && !key.ctrl && !key.meta) {
				setSearchQuery((prev) => prev + input);
				setSelectedIndex(0);
			}
			return;
		}

		if (deleteConfirm !== null) {
			if (input === 'y' || input === 'Y') {
				const { [deleteConfirm]: _, ...rest } = config.aliases;
				onSave({ ...config, aliases: rest });
				setSelectedIndex((prev) =>
					Math.max(0, Math.min(prev, aliasNames.length - 2)),
				);
			}
			setDeleteConfirm(null);
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
			setDeleteConfirm(aliasNames[selectedIndex]);
		} else if (input === '/') {
			setIsSearching(true);
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

			{isSearching ? (
				<Box marginBottom={1}>
					<Text color={COLOR.YELLOW}>Search: </Text>
					<Text>{searchQuery}</Text>
					<Text dimColor>|</Text>
				</Box>
			) : null}

			{aliasNames.length === 0 ? (
				<Text dimColor>
					{searchQuery
						? `No aliases match "${searchQuery}".`
						: "No aliases configured. Press 'n' to create one."}
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
				<Box marginTop={1} flexDirection="column">
					<Box>
						<Text color={COLOR.GREEN}>New alias name: </Text>
						<Text>{newName}</Text>
						<Text dimColor>|</Text>
					</Box>
					{error ? <Text color={COLOR.RED}>{error}</Text> : null}
				</Box>
			) : null}

			{deleteConfirm ? (
				<Box marginTop={1}>
					<Text color={COLOR.RED}>Delete alias </Text>
					<Text color={COLOR.RED} bold>
						{deleteConfirm}
					</Text>
					<Text color={COLOR.RED}>? (y/N)</Text>
				</Box>
			) : null}

			<StatusBar>
				<Text bold>↑↓</Text> navigate
				<Text dimColor> │ </Text>
				<Text bold>Enter</Text> edit
				<Text dimColor> │ </Text>
				<Text bold>n</Text> new
				<Text dimColor> │ </Text>
				<Text bold>d</Text> delete
				<Text dimColor> │ </Text>
				<Text bold>q</Text> quit
			</StatusBar>
		</Box>
	);
}
