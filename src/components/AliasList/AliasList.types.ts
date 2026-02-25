import type { Config } from '../../types/Config/index.js';

export interface AliasListProps {
	config: Config;
	onSave: (config: Config) => void;
	onEditAlias: (name: string) => void;
}
