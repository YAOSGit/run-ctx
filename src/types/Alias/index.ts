import type { Rule } from '../Rule/index.js';

export type Alias = {
	description?: string;
	rules: Rule[];
	fallback?: string;
	shell?: boolean;
};
