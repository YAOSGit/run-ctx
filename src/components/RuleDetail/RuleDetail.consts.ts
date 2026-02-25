import type { FieldConfig } from './RuleDetail.types.js';

export const FIELDS: FieldConfig[] = [
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
