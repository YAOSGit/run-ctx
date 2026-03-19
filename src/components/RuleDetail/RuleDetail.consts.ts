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
		hint: 'File pattern to check in cwd (e.g. *.ts, src/**/*.json)',
	},
	{
		key: 'cwd',
		label: 'cwd (regex)',
		hint: 'Regex to match against cwd path (e.g. /my-project/)',
	},
	{
		key: 'env',
		label: 'env var',
		hint: 'Environment variable that must be set (e.g. NODE_ENV=production)',
	},
];
