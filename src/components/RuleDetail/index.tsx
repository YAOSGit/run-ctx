import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { MatchCondition, Rule } from '../../types/Rule/index.js';

type Props = {
	rule: Rule;
	onSave: (rule: Rule) => void;
	onBack: () => void;
};

type Field = 'command' | 'file' | 'cwd' | 'env';

const FIELDS: { key: Field; label: string; hint: string }[] = [
	{
		key: 'command',
		label: 'command',
		hint: 'The command to execute (e.g. npm run dev)',
	},
	{
		key: 'file',
		label: 'file (glob)',
		hint: 'File pattern to check in cwd. [a]dd [d]elete [Enter]edit',
	},
	{
		key: 'cwd',
		label: 'cwd (regex)',
		hint: 'Regex to match against cwd path. [a]dd [d]elete [Enter]edit',
	},
	{
		key: 'env',
		label: 'env var',
		hint: 'Environment variable that must be set. [a]dd [d]elete [Enter]edit',
	},
];

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

export default function RuleDetail({ rule, onSave, onBack }: Props) {
	const [selectedField, setSelectedField] = useState(0);
	const [selectedEntry, setSelectedEntry] = useState(0);
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState('');

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
		} else if (input === 'd' && currentField !== 'command' && entries.length > 0) {
			const updated = entries.filter((_, i) => i !== selectedEntry);
			onSave(setEntries(rule, currentField, updated));
			setSelectedEntry(Math.max(0, selectedEntry - 1));
		} else if (key.escape || input === 'q') {
			onBack();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Edit Rule
				</Text>
			</Box>

			{FIELDS.map((field, fieldIndex) => {
				const isActiveField = fieldIndex === selectedField;
				const fieldEntries = getEntries(rule, field.key);

				return (
					<Box key={field.key} flexDirection="column" marginBottom={1}>
						<Box>
							<Text color={isActiveField ? 'cyan' : 'white'}>
								{isActiveField ? '> ' : '  '}
								<Text bold>{field.label}: </Text>
							</Text>
						</Box>

						{fieldEntries.length === 0 ? (
							<Box>
								<Text color="gray">{'    (empty)'}</Text>
							</Box>
						) : (
							fieldEntries.map((entry, entryIndex) => {
								const isActiveEntry =
									isActiveField && entryIndex === selectedEntry;
								const isEditing = editing && isActiveEntry;
								const showNumber = field.key !== 'command';

								return (
									<Box key={`${field.key}-${entryIndex}`}>
										<Text color={isActiveEntry ? 'green' : 'white'}>
											{'    '}
											{showNumber ? `${entryIndex + 1}. ` : ''}
											{isEditing ? (
												<>
													<Text color="green">{editValue}</Text>
													<Text color="gray">|</Text>
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
							<Text color="gray">
								{'    '}
								{field.hint}
							</Text>
						) : null}
					</Box>
				);
			})}

			<Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
				<Text color="gray">
					{'\u2191\u2193'} navigate {'\u00B7'} Enter edit {'\u00B7'} a add {'\u00B7'} d
					delete {'\u00B7'} Esc back
				</Text>
			</Box>
		</Box>
	);
}
