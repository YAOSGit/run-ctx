import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import { COLOR } from '../../types/Color/index.js';
import type { MatchCondition, Rule } from '../../types/Rule/index.js';
import { StatusBar } from '../StatusBar/index.js';
import { FIELDS } from './RuleDetail.consts.js';
import type { Field, RuleDetailProps } from './RuleDetail.types.js';

function getEntries(rule: Rule, field: Field): string[] {
	if (field === 'command') return [rule.command];
	const value = rule.match[field];
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

function setEntries(rule: Rule, field: Field, entries: string[]): Rule {
	if (field === 'command') {
		return { ...rule, command: entries[0] ?? '' };
	}
	const newMatch: MatchCondition = { ...rule.match };
	const filtered = entries.filter((e) => e.trim() !== '');
	if (filtered.length === 0) {
		delete newMatch[field];
	} else if (filtered.length === 1) {
		newMatch[field] = filtered[0];
	} else {
		newMatch[field] = filtered;
	}
	return { ...rule, match: newMatch };
}

export function RuleDetail({ rule, onSave, onBack }: RuleDetailProps) {
	const [selectedField, setSelectedField] = useState(0);
	const [selectedEntry, setSelectedEntry] = useState(0);
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState('');
	const [deleteConfirmIndex, setDeleteConfirmIndex] = useState<number | null>(
		null,
	);

	const currentField = FIELDS[selectedField].key;
	const entries = getEntries(rule, currentField);

	useInput((input, key) => {
		if (editing) {
			if (key.return) {
				const updated = [...entries];
				updated[selectedEntry] = editValue;
				onSave(setEntries(rule, currentField, updated));
				setEditing(false);
			} else if (key.escape) {
				setEditing(false);
			} else if (key.backspace || key.delete) {
				setEditValue((prev) => prev.slice(0, -1));
			} else if (input && !key.ctrl && !key.meta) {
				setEditValue((prev) => prev + input);
			}
			return;
		}

		if (deleteConfirmIndex !== null) {
			if (input === 'y' || input === 'Y') {
				const updated = entries.filter((_, i) => i !== deleteConfirmIndex);
				onSave(setEntries(rule, currentField, updated));
				setSelectedEntry(Math.max(0, deleteConfirmIndex - 1));
			}
			setDeleteConfirmIndex(null);
			return;
		}

		if (key.upArrow) {
			if (selectedEntry > 0) {
				setSelectedEntry((prev) => prev - 1);
			} else {
				const prevField = Math.max(0, selectedField - 1);
				setSelectedField(prevField);
				const prevEntries = getEntries(rule, FIELDS[prevField].key);
				setSelectedEntry(Math.max(0, prevEntries.length - 1));
			}
		} else if (key.downArrow) {
			if (selectedEntry < entries.length - 1) {
				setSelectedEntry((prev) => prev + 1);
			} else {
				const nextField = Math.min(FIELDS.length - 1, selectedField + 1);
				if (nextField !== selectedField) {
					setSelectedField(nextField);
					setSelectedEntry(0);
				}
			}
		} else if (key.return) {
			if (entries.length > 0) {
				setEditing(true);
				setEditValue(entries[selectedEntry] ?? '');
			} else {
				// No entries — treat Enter as add
				const updated = [...entries, ''];
				onSave(setEntries(rule, currentField, updated));
				setSelectedEntry(updated.length - 1);
				setEditing(true);
				setEditValue('');
			}
		} else if (input === 'a' && currentField !== 'command') {
			const updated = [...entries, ''];
			onSave(setEntries(rule, currentField, updated));
			setSelectedEntry(updated.length - 1);
			setEditing(true);
			setEditValue('');
		} else if (
			input === 'd' &&
			currentField !== 'command' &&
			entries.length > 0
		) {
			setDeleteConfirmIndex(selectedEntry);
		} else if (key.escape || input === 'q') {
			onBack();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color={COLOR.CYAN}>
					Edit Rule
				</Text>
			</Box>

			{FIELDS.map((field, fieldIndex) => {
				const isActiveField = fieldIndex === selectedField;
				const fieldEntries = getEntries(rule, field.key);

				return (
					<Box key={field.key} flexDirection="column" marginBottom={1}>
						<Box>
							<Text color={isActiveField ? COLOR.CYAN : COLOR.WHITE}>
								{isActiveField ? '> ' : '  '}
								<Text bold>{field.label}: </Text>
							</Text>
						</Box>

						{fieldEntries.length === 0 ? (
							<Box>
								<Text dimColor>{'    (empty)'}</Text>
							</Box>
						) : (
							fieldEntries.map((entry, entryIndex) => {
								const isActiveEntry =
									isActiveField && entryIndex === selectedEntry;
								const isEditing = editing && isActiveEntry;
								const showNumber = field.key !== 'command';

								return (
									<Box key={`${field.key}-${entryIndex}`}>
										<Text color={isActiveEntry ? COLOR.GREEN : COLOR.WHITE}>
											{'    '}
											{showNumber ? `${entryIndex + 1}. ` : ''}
											{isEditing ? (
												<>
													<Text color={COLOR.GREEN}>{editValue}</Text>
													<Text dimColor>|</Text>
												</>
											) : (
												<Text>{entry || '(empty)'}</Text>
											)}
										</Text>
									</Box>
								);
							})
						)}

						{isActiveField && !editing ? (
							<Text dimColor>
								{'    '}
								{field.hint}
							</Text>
						) : null}
					</Box>
				);
			})}

			{deleteConfirmIndex !== null ? (
				<Box marginTop={0} marginBottom={1}>
					<Text color={COLOR.RED}>Delete condition entry </Text>
					<Text color={COLOR.RED} bold>
						#{deleteConfirmIndex + 1}
					</Text>
					<Text color={COLOR.RED}>? (y/N)</Text>
				</Box>
			) : null}

			<StatusBar>
				<Text bold>↑↓</Text> navigate
				<Text dimColor> │ </Text>
				<Text bold>Enter</Text> edit
				<Text dimColor> │ </Text>
				<Text bold>a</Text> add
				<Text dimColor> │ </Text>
				<Text bold>d</Text> delete
				<Text dimColor> │ </Text>
				<Text bold>Esc</Text> back
			</StatusBar>
		</Box>
	);
}
