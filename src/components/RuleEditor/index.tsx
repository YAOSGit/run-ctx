import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Alias } from '../../types/Alias/index.js';

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
				<Text bold color="cyan">
					{aliasName}
				</Text>
				{alias.description ? (
					<Text color="gray"> — {alias.description}</Text>
				) : null}
			</Box>

			{alias.rules.length === 0 ? (
				<Text color="gray">No rules. Press 'n' to add one.</Text>
			) : (
				alias.rules.map((rule, index) => {
					const isSelected = index === selectedIndex;
					return (
						// biome-ignore lint/suspicious/noArrayIndexKey: rules have no stable unique ID
						<Box key={index} flexDirection="column" marginBottom={1}>
							<Text color={isSelected ? 'cyan' : undefined}>
								{isSelected ? '> ' : '  '}
								<Text bold>
									{'\u2192'} {rule.command || '(empty command)'}
								</Text>
							</Text>
							<Text color="gray">
								{'    '}
								when: {formatMatch(rule.match) || '(no conditions)'}
							</Text>
						</Box>
					);
				})
			)}

			<Box marginBottom={1}>
				<Text color={isFallbackSelected ? 'cyan' : undefined}>
					{isFallbackSelected ? '> ' : '  '}
					<Text bold>Fallback: </Text>
					{editingFallback ? (
						<Text>
							{editValue}
							<Text color="cyan">{'|'}</Text>
						</Text>
					) : (
						<Text color={alias.fallback ? undefined : 'gray'}>
							{fallbackDisplay}
						</Text>
					)}
				</Text>
			</Box>

			<Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
				<Text color="gray">
					{'\u2191\u2193'} navigate {'\u00B7'} Enter edit {'\u00B7'} n new{' '}
					{'\u00B7'} d delete {'\u00B7'} j/J reorder {'\u00B7'} q/Esc back
				</Text>
			</Box>
		</Box>
	);
}
