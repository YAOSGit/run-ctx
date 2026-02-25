export type MatchCondition = {
	/** Glob pattern(s) checked against files in cwd. Array = AND (all must match). */
	file?: string | string[];
	/** Regex pattern(s) matched against full cwd path. Array = AND (all must match). */
	cwd?: string | string[];
	/** Environment variable name(s) that must be set and non-empty. Array = AND (all must match). */
	env?: string | string[];
};

export type Rule = {
	match: MatchCondition;
	command: string;
	shell?: boolean;
};
