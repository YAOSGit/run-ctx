import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import { useUIStateContext } from '../../providers/UIStateProvider/index.js';
import { theme } from '../../theme.js';
import { COLOR } from '../../types/Color/index.js';
import type { RuleEditorProps } from './RuleEditor.types.js';

const formatMatchValue = (value: string | string[]): string => {
	return Array.isArray(value) ? value.join(', ') : value;
};

const formatMatch = (
	match: Record<string, string | string[] | undefined>,
): string => {
	const parts: string[] = [];
	if (match.file) parts.push(`file: ${formatMatchValue(match.file)}`);
	if (match.cwd) parts.push(`cwd: ${formatMatchValue(match.cwd)}`);
	if (match.env) parts.push(`env: ${formatMatchValue(match.env)}`);
	return parts.join(', ');
};

export function RuleEditor({
	aliasName,
	alias,
	onSave,
	onBack,
	onEditRule,
	onRename,
}: RuleEditorProps) {
	const ui = useUIStateContext();
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [editingField, setEditingField] = useState<
		'name' | 'description' | 'fallback' | null
	>(null);
	const [editValue, setEditValue] = useState('');

	const isFallbackSelected = selectedIndex === alias.rules.length + 2;
	const isInRulesRange =
		selectedIndex >= 2 && selectedIndex < alias.rules.length + 2;

	const enterFieldEdit = (
		field: 'name' | 'description' | 'fallback',
		value: string,
	) => {
		setEditingField(field);
		setEditValue(value);
		ui.setInputActive(true);
	};

	const exitFieldEdit = () => {
		setEditingField(null);
		ui.setInputActive(false);
	};

	useInput((input, key) => {
		if (ui.confirmation) return;

		if (editingField !== null) {
			if (key.return) {
				if (editingField === 'name') {
					const trimmed = editValue.trim();
					if (trimmed !== '' && trimmed !== aliasName) {
						onRename(aliasName, trimmed);
					}
				} else if (editingField === 'description') {
					onSave({ ...alias, description: editValue.trim() || undefined });
				} else if (editingField === 'fallback') {
					onSave({
						...alias,
						fallback: editValue === '' ? undefined : editValue,
					});
				}
				exitFieldEdit();
			} else if (key.escape) {
				exitFieldEdit();
			} else if (key.backspace || key.delete) {
				setEditValue((prev) => prev.slice(0, -1));
			} else if (input && !key.ctrl && !key.meta) {
				setEditValue((prev) => prev + input);
			}
			return;
		}

		if (key.upArrow) {
			setSelectedIndex((prev) => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex((prev) => Math.min(alias.rules.length + 2, prev + 1));
		} else if (key.return) {
			if (selectedIndex === 0) {
				enterFieldEdit('name', aliasName);
			} else if (selectedIndex === 1) {
				enterFieldEdit('description', alias.description ?? '');
			} else if (isFallbackSelected) {
				enterFieldEdit('fallback', alias.fallback ?? '');
			} else if (isInRulesRange && alias.rules.length > 0) {
				onEditRule(selectedIndex - 2);
			}
		} else if (input === 'n' && !isFallbackSelected && selectedIndex >= 0) {
			const newRules = [...alias.rules, { match: {}, command: '' }];
			onSave({ ...alias, rules: newRules });
			onEditRule(newRules.length - 1);
		} else if (input === 'd' && isInRulesRange && alias.rules.length > 0) {
			const ruleIndex = selectedIndex - 2;
			ui.requestConfirmation(`Delete rule #${ruleIndex + 1}?`, () => {
				const newRules = alias.rules.filter((_, i) => i !== ruleIndex);
				onSave({ ...alias, rules: newRules });
				setSelectedIndex((prev) => Math.min(prev, newRules.length + 1));
			});
		} else if (
			input === 'j' &&
			isInRulesRange &&
			selectedIndex - 2 < alias.rules.length - 1
		) {
			const ruleIndex = selectedIndex - 2;
			const newRules = [...alias.rules];
			[newRules[ruleIndex], newRules[ruleIndex + 1]] = [
				newRules[ruleIndex + 1],
				newRules[ruleIndex],
			];
			onSave({ ...alias, rules: newRules });
			setSelectedIndex((prev) => prev + 1);
		} else if (input === 'k' && isInRulesRange && selectedIndex - 2 > 0) {
			const ruleIndex = selectedIndex - 2;
			const newRules = [...alias.rules];
			[newRules[ruleIndex], newRules[ruleIndex - 1]] = [
				newRules[ruleIndex - 1],
				newRules[ruleIndex],
			];
			onSave({ ...alias, rules: newRules });
			setSelectedIndex((prev) => prev - 1);
		} else if (key.escape || input === 'q') {
			onBack();
		}
	});

	const fallbackDisplay =
		editingField === 'fallback' ? editValue : (alias.fallback ?? '(none)');

	return (
		<Box flexDirection="column" padding={1}>
			{/* Name field */}
			<Box marginBottom={0}>
				<Text color={selectedIndex === 0 ? theme.brand : undefined}>
					{selectedIndex === 0 ? '\u25b8 ' : '  '}
					<Text bold>Name: </Text>
					{editingField === 'name' ? (
						<Text>
							{editValue}
							<Text color={theme.brand}>{'|'}</Text>
						</Text>
					) : (
						<Text>{aliasName}</Text>
					)}
				</Text>
			</Box>

			{/* Usage preview */}
			<Box marginBottom={0}>
				<Text dimColor>
					{'    Usage: '}
					<Text color={COLOR.YELLOW}>
						rc{' '}
						{(editingField === 'name' ? editValue : aliasName).replace(
							/\./g,
							' ',
						)}{' '}
						[args...]
					</Text>
				</Text>
			</Box>

			{/* Description field */}
			<Box marginBottom={0}>
				<Text color={selectedIndex === 1 ? theme.brand : undefined}>
					{selectedIndex === 1 ? '\u25b8 ' : '  '}
					<Text bold>Description: </Text>
					{editingField === 'description' ? (
						<Text>
							{editValue}
							<Text color={theme.brand}>{'|'}</Text>
						</Text>
					) : (
						<Text dimColor={!alias.description}>
							{alias.description ?? '(none)'}
						</Text>
					)}
				</Text>
			</Box>

			{/* Separator */}
			<Box marginTop={1} marginBottom={1}>
				<Text dimColor>{'  ────── rules ──────'}</Text>
			</Box>

			{alias.rules.length === 0 ? (
				<Text dimColor> No rules. Press 'n' to add one.</Text>
			) : (
				alias.rules.map((rule, index) => {
					const isSelected = index + 2 === selectedIndex;
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: rules have no stable unique ID
						<Box key={index} flexDirection="column" marginBottom={1}>
							<Text color={isSelected ? theme.brand : undefined}>
								{isSelected ? '\u25b8 ' : '  '}
								<Text bold>{rule.command || '(empty command)'}</Text>
							</Text>
							<Text dimColor>
								{'    '}
								when: {formatMatch(rule.match) || '(always match)'}
							</Text>
						</Box>
					);
				})
			)}

			{/* Separator */}
			<Box marginTop={0} marginBottom={1}>
				<Text dimColor>{'  ──────────────────'}</Text>
			</Box>

			<Box marginBottom={0}>
				<Text color={isFallbackSelected ? theme.brand : undefined}>
					{isFallbackSelected ? '\u25b8 ' : '  '}
					<Text bold>Fallback: </Text>
					{editingField === 'fallback' ? (
						<Text>
							{editValue}
							<Text color={theme.brand}>{'|'}</Text>
						</Text>
					) : (
						<Text dimColor={!alias.fallback}>{fallbackDisplay}</Text>
					)}
				</Text>
			</Box>
		</Box>
	);
}
