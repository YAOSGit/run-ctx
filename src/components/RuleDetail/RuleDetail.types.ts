import type { Rule } from '../../types/Rule/index.js';

export interface RuleDetailProps {
	rule: Rule;
	onSave: (rule: Rule) => void;
	onBack: () => void;
}

export type Field = 'command' | 'file' | 'cwd' | 'env';

export interface FieldConfig {
	key: Field;
	label: string;
	hint: string;
}
