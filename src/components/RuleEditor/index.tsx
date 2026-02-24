import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Alias } from '../../types/Alias/index.js';
import { COLOR } from '../../types/Color/index.js';

type Props = {
	aliasName: string;
	alias: Alias;
	onSave: (alias: Alias) => void;
	onBack: () => void;
	onEditRule: (index: number) => void;
	onRename: (oldName: string, newName: string) => void;
};

function formatMatchValue(value: string | string[]): string {
	return Array.isArray(value) ? value.join(', ') : value;
}

function formatMatch(
	match: Record<string, string | string[] | undefined>,
): string {
	const parts: string[] = [];
	if (match.file) parts.push(`file: ${formatMatchValue(match.file)}`);
	if (match.cwd) parts.push(`cwd: ${formatMatchValue(match.cwd)}`);
	if (match.env) parts.push(`env: ${formatMatchValue(match.env)}`);
	return parts.join(', ');
}

export default function RuleEditor({
	aliasName,
	alias,
	onSave,
	onBack,
	onEditRule,
	onRename,
}: Props) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [editingField, setEditingField] = useState<'name' | 'description' | 'fallback' | null>(null);
	const [editValue, setEditValue] = useState('');

	const isFallbackSelected = selectedIndex === alias.rules.length + 2;
	const isInRulesRange = selectedIndex >= 2 && selectedIndex < alias.rules.length + 2;

	useInput((input, key) => {
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
					const newFallback = editValue === '' ? null : editValue;
					onSave({ ...alias, fallback: newFallback });
				}
				setEditingField(null);
			} else if (key.escape) {
				setEditingField(null);
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
				setEditValue('');
				setEditingField('name');
			} else if (selectedIndex === 1) {
				setEditValue(alias.description ?? '');
				setEditingField('description');
			} else if (isFallbackSelected) {
				setEditValue(alias.fallback ?? '');
				setEditingField('fallback');
			} else if (isInRulesRange && alias.rules.length > 0) {
				onEditRule(selectedIndex - 2);
			}
		} else if (input === 'n' && isInRulesRange) {
			const newRules = [...alias.rules, { match: {}, command: '' }];
			onSave({ ...alias, rules: newRules });
			onEditRule(newRules.length - 1);
		} else if (input === 'd' && isInRulesRange && alias.rules.length > 0) {
			const ruleIndex = selectedIndex - 2;
			const newRules = alias.rules.filter((_, i) => i !== ruleIndex);
			onSave({ ...alias, rules: newRules });
			setSelectedIndex((prev) => Math.min(prev, newRules.length + 1));
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
		} else if (input === 'J' && isInRulesRange && selectedIndex - 2 > 0) {
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

	const fallbackDisplay = editingField === 'fallback'
		? editValue || ''
		: alias.fallback ?? '(none)';

	return (
		<Box flexDirection="column" padding={1}>
			{/* Name field */}
			<Box marginBottom={0}>
				<Text color={selectedIndex === 0 ? COLOR.CYAN : undefined}>
					{selectedIndex === 0 ? '> ' : '  '}
					<Text bold>Name: </Text>
					{editingField === 'name' ? (
						<Text>
							{editValue}
							<Text color={COLOR.CYAN}>{'|'}</Text>
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
						rc {(editingField === 'name' ? editValue : aliasName).replace(/\./g, ' ')} [args...]
					</Text>
				</Text>
			</Box>

			{/* Description field */}
			<Box marginBottom={1}>
				<Text color={selectedIndex === 1 ? COLOR.CYAN : undefined}>
					{selectedIndex === 1 ? '> ' : '  '}
					<Text bold>Description: </Text>
					{editingField === 'description' ? (
						<Text>
							{editValue}
							<Text color={COLOR.CYAN}>{'|'}</Text>
						</Text>
					) : (
						<Text dimColor={!alias.description}>
							{alias.description ?? '(none)'}
						</Text>
					)}
				</Text>
			</Box>

			{alias.rules.length === 0 ? (
				<Text dimColor>No rules. Press 'n' to add one.</Text>
			) : (
				alias.rules.map((rule, index) => {
					const isSelected = index + 2 === selectedIndex;
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: rules have no stable unique ID
						<Box key={index} flexDirection="column" marginBottom={1}>
							<Text color={isSelected ? COLOR.CYAN : undefined}>
								{isSelected ? '> ' : '  '}
								<Text bold>
									{'\u2192'} {rule.command || '(empty command)'}
								</Text>
							</Text>
							<Text dimColor>
								{'    '}
								when: {formatMatch(rule.match) || '(no conditions)'}
							</Text>
						</Box>
					);
				})
			)}

			<Box marginBottom={1}>
				<Text color={isFallbackSelected ? COLOR.CYAN : undefined}>
					{isFallbackSelected ? '> ' : '  '}
					<Text bold>Fallback: </Text>
					{editingField === 'fallback' ? (
						<Text>
							{editValue}
							<Text color={COLOR.CYAN}>{'|'}</Text>
						</Text>
					) : (
						<Text dimColor={!alias.fallback}>
							{fallbackDisplay}
						</Text>
					)}
				</Text>
			</Box>

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
					<Text bold>j/J</Text> reorder
					<Text dimColor> │ </Text>
					<Text bold>q/Esc</Text> back
				</Text>
			</Box>
		</Box>
	);
}
