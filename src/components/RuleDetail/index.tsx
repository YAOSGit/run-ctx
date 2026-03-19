import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import { COLOR } from '../../types/Color/index.js';
import type { MatchCondition, Rule } from '../../types/Rule/index.js';
import { useUIStateContext } from '../../providers/UIStateProvider/index.js';
import { theme } from '../../theme.js';
import { FIELDS } from './RuleDetail.consts.js';
import type { Field, RuleDetailProps } from './RuleDetail.types.js';

const getEntries = (rule: Rule, field: Field): string[] => {
	if (field === 'command') return [rule.command];
	const value = rule.match[field];
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
};

const setEntries = (rule: Rule, field: Field, entries: string[]): Rule => {
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
};

export function RuleDetail({ rule, onSave, onBack }: RuleDetailProps) {
	const ui = useUIStateContext();
	const [selectedField, setSelectedField] = useState(0);
	const [selectedEntry, setSelectedEntry] = useState(0);
	const [editing, setEditing] = useState(false);
	const [isAdding, setIsAdding] = useState(false);
	const [editValue, setEditValue] = useState('');

	const currentField = FIELDS[selectedField].key;
	const entries = getEntries(rule, currentField);

	const enterEdit = (value: string, adding = false) => {
		setEditing(true);
		setIsAdding(adding);
		setEditValue(value);
		ui.setInputActive(true);
	};

	const exitEdit = () => {
		setEditing(false);
		setIsAdding(false);
		ui.setInputActive(false);
	};

	useInput((input, key) => {
		if (ui.confirmation) return;

		if (editing) {
			if (key.return) {
				if (isAdding) {
					const trimmed = editValue.trim();
					if (trimmed) {
						const updated = [...entries, trimmed];
						onSave(setEntries(rule, currentField, updated));
						setSelectedEntry(updated.length - 1);
					}
				} else {
					const updated = [...entries];
					updated[selectedEntry] = editValue;
					onSave(setEntries(rule, currentField, updated));
				}
				exitEdit();
			} else if (key.escape) {
				exitEdit();
			} else if (key.backspace || key.delete) {
				setEditValue((prev) => prev.slice(0, -1));
			} else if (input && !key.ctrl && !key.meta) {
				setEditValue((prev) => prev + input);
			}
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
				enterEdit(entries[selectedEntry] ?? '');
			} else {
				enterEdit('', true);
			}
		} else if (input === 'a' && currentField !== 'command') {
			enterEdit('', true);
		} else if (
			input === 'd' &&
			currentField !== 'command' &&
			entries.length > 0
		) {
			ui.requestConfirmation(`Delete entry #${selectedEntry + 1}?`, () => {
				const updated = entries.filter((_, i) => i !== selectedEntry);
				onSave(setEntries(rule, currentField, updated));
				setSelectedEntry(Math.max(0, selectedEntry - 1));
			});
		} else if (key.escape || input === 'q') {
			onBack();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			{FIELDS.map((field, fieldIndex) => {
				const isActiveField = fieldIndex === selectedField;
				const fieldEntries = getEntries(rule, field.key);
				const isCommandField = field.key === 'command';
				const showSeparatorAfter = isCommandField && FIELDS.length > 1;

				return (
					<Box key={field.key} flexDirection="column">
						<Box>
							<Text color={isActiveField ? theme.brand : COLOR.WHITE}>
								{isActiveField ? '\u25b8 ' : '  '}
								<Text bold>{field.label}: </Text>
							</Text>
						</Box>

						{fieldEntries.length === 0 && !(isActiveField && isAdding) ? (
							<Box>
								<Text dimColor>{'    (empty)'}</Text>
							</Box>
						) : (
							fieldEntries.map((entry, entryIndex) => {
								const isActiveEntry =
									isActiveField && entryIndex === selectedEntry;
								const isEditingEntry = editing && !isAdding && isActiveEntry;
								const showNumber = !isCommandField;

								return (
									<Box key={`${field.key}-${entryIndex}`}>
										<Text color={isActiveEntry && !isAdding ? COLOR.GREEN : COLOR.WHITE}>
											{'    '}
											{showNumber ? `${entryIndex + 1}. ` : ''}
											{isEditingEntry ? (
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

						{isActiveField && isAdding ? (
							<Box>
								<Text color={COLOR.GREEN}>
									{'    '}
									{!isCommandField ? `${fieldEntries.length + 1}. ` : ''}
									{editValue}
									<Text dimColor>|</Text>
								</Text>
							</Box>
						) : null}

						{isActiveField && !editing ? (
							<Text dimColor>
								{'    '}
								{field.hint}
							</Text>
						) : null}

						{showSeparatorAfter ? (
							<Box marginTop={1} marginBottom={1}>
								<Text dimColor>{'  ────── conditions ──────'}</Text>
							</Box>
						) : null}
					</Box>
				);
			})}

		</Box>
	);
}
