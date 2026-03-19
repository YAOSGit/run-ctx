export {
	getConfigPath,
	loadConfig,
	saveConfig,
	bootstrapStarterConfig,
} from './config/index.js';
export {
	parseCommand,
	buildCommandArgs,
	execute,
} from './executor/index.js';
export type { ParsedCommand } from './executor/index.js';
export {
	evaluateRule,
	compareScores,
	findBestMatch,
} from './matcher/index.js';
export type { EvalResult, MatchResult, FindBestMatchOptions } from './matcher/index.js';
export { resolveAlias } from './resolver/index.js';
export type { ResolveResult } from './resolver/index.js';
