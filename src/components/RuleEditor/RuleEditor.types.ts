import type { Alias } from '../../types/Alias/index.js';

export interface RuleEditorProps {
	aliasName: string;
	alias: Alias;
	onSave: (alias: Alias) => void;
	onBack: () => void;
	onEditRule: (index: number) => void;
	onRename: (oldName: string, newName: string) => void;
}
