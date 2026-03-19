import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import { COLOR } from '../../types/Color/index.js';
import { useUIStateContext } from '../../providers/UIStateProvider/index.js';
import { theme } from '../../theme.js';
import type { AliasListProps } from './AliasList.types.js';

export function AliasList({ config, onSave, onEditAlias }: AliasListProps) {
	const ui = useUIStateContext();

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState('');
	const [error, setError] = useState<string | null>(null);

	const [isSearching, setIsSearching] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const aliasNames = Object.keys(config.aliases).filter((name) =>
		name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const enterCreateMode = () => {
		setIsCreating(true);
		ui.setInputActive(true);
	};

	const exitCreateMode = () => {
		setIsCreating(false);
		setNewName('');
		setError(null);
		ui.setInputActive(false);
	};

	const enterSearchMode = () => {
		setIsSearching(true);
		ui.setInputActive(true);
	};

	const exitSearchMode = () => {
		setIsSearching(false);
		ui.setInputActive(false);
	};

	useInput((input, key) => {
		if (ui.confirmation) return;

		if (isCreating) {
			if (key.return) {
				const trimmed = newName.trim();
				if (trimmed) {
					if (trimmed.startsWith('-')) {
						setError('Alias names cannot start with a dash (-)');
						return;
					}
					onSave({
						...config,
						aliases: { ...config.aliases, [trimmed]: { rules: [] } },
					});
				}
				exitCreateMode();
			} else if (key.escape) {
				exitCreateMode();
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
				exitSearchMode();
			} else if (key.backspace || key.delete) {
				setSearchQuery((prev) => prev.slice(0, -1));
				setSelectedIndex(0);
			} else if (input && !key.ctrl && !key.meta) {
				setSearchQuery((prev) => prev + input);
				setSelectedIndex(0);
			}
			return;
		}

		if (key.upArrow) {
			setSelectedIndex((prev) => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex((prev) => Math.min(aliasNames.length - 1, prev + 1));
		} else if (key.return && aliasNames.length > 0) {
			onEditAlias(aliasNames[selectedIndex] ?? '');
		} else if (input === 'n') {
			enterCreateMode();
		} else if (input === 'd' && aliasNames.length > 0) {
			const name = aliasNames[selectedIndex] ?? '';
			ui.requestConfirmation(`Delete alias "${name}"?`, () => {
				const { [name]: _, ...rest } = config.aliases;
				onSave({ ...config, aliases: rest });
				setSelectedIndex((prev) =>
					Math.max(0, Math.min(prev, aliasNames.length - 2)),
				);
			});
		} else if (input === '/') {
			enterSearchMode();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
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
					const ruleCount = alias?.rules.length ?? 0;
					const isSelected = index === selectedIndex;

					return (
						<Box key={name}>
							<Text color={isSelected ? theme.brand : undefined}>
								{isSelected ? '\u25b8 ' : '  '}
								<Text bold>{name}</Text>
								{alias?.description ? (
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

		</Box>
	);
}
