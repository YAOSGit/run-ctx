export {
	bootstrapStarterConfig,
	getConfigPath,
	loadConfig,
	saveConfig,
} from './config/index.js';
export type { ParsedCommand } from './executor/index.js';
export {
	buildCommandArgs,
	execute,
	parseCommand,
} from './executor/index.js';
export type {
	EvalResult,
	FindBestMatchOptions,
	MatchResult,
} from './matcher/index.js';
export {
	compareScores,
	evaluateRule,
	findBestMatch,
} from './matcher/index.js';
export type { ResolveResult } from './resolver/index.js';
export { resolveAlias } from './resolver/index.js';
