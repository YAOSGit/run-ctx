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
}: Props) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [editingFallback, setEditingFallback] = useState(false);
	const [editValue, setEditValue] = useState('');

	const isFallbackSelected = selectedIndex === alias.rules.length;

	useInput((input, key) => {
		if (editingFallback) {
			if (key.return) {
				const newFallback = editValue === '' ? null : editValue;
				onSave({ ...alias, fallback: newFallback });
				setEditingFallback(false);
			} else if (key.escape) {
				setEditingFallback(false);
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
			setSelectedIndex((prev) => Math.min(alias.rules.length, prev + 1));
		} else if (key.return) {
			if (isFallbackSelected) {
				setEditValue(alias.fallback ?? '');
				setEditingFallback(true);
			} else if (alias.rules.length > 0) {
				onEditRule(selectedIndex);
			}
		} else if (input === 'n' && !isFallbackSelected) {
			const newRules = [...alias.rules, { match: {}, command: '' }];
			onSave({ ...alias, rules: newRules });
			onEditRule(newRules.length - 1);
		} else if (input === 'd' && !isFallbackSelected && alias.rules.length > 0) {
			const newRules = alias.rules.filter((_, i) => i !== selectedIndex);
			onSave({ ...alias, rules: newRules });
			setSelectedIndex((prev) => Math.min(prev, newRules.length - 1));
		} else if (
			input === 'j' &&
			!isFallbackSelected &&
			selectedIndex < alias.rules.length - 1
		) {
			const newRules = [...alias.rules];
			[newRules[selectedIndex], newRules[selectedIndex + 1]] = [
				newRules[selectedIndex + 1],
				newRules[selectedIndex],
			];
			onSave({ ...alias, rules: newRules });
			setSelectedIndex((prev) => prev + 1);
		} else if (input === 'J' && !isFallbackSelected && selectedIndex > 0) {
			const newRules = [...alias.rules];
			[newRules[selectedIndex], newRules[selectedIndex - 1]] = [
				newRules[selectedIndex - 1],
				newRules[selectedIndex],
			];
			onSave({ ...alias, rules: newRules });
			setSelectedIndex((prev) => prev - 1);
		} else if (key.escape || input === 'q') {
			onBack();
		}
	});

	const fallbackDisplay = editingFallback
		? editValue || ''
		: alias.fallback ?? '(none)';

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color={COLOR.CYAN}>
					{aliasName}
				</Text>
				{alias.description ? (
					<Text dimColor> — {alias.description}</Text>
				) : null}
			</Box>

			{alias.rules.length === 0 ? (
				<Text dimColor>No rules. Press 'n' to add one.</Text>
			) : (
				alias.rules.map((rule, index) => {
					const isSelected = index === selectedIndex;
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
					{editingFallback ? (
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
