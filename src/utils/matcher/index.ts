import fs from 'node:fs';
import picomatch from 'picomatch';
import RE2 from 're2';
import type { Rule } from '../../types/Rule/index.js';

export type EvalResult = {
	matched: boolean;
	score: [number, number, number];
	totalConditions: number;
	logs: string[];
};

export type MatchResult = {
	command: string;
	rule: Rule;
	score: [number, number, number];
} | null;

export type FindBestMatchOptions = {
	verbose?: boolean;
	aliasName?: string;
};

export function evaluateRule(
	rule: Rule,
	cwd: string,
	env: Record<string, string | undefined>,
	filesMemo?: string[],
): EvalResult {
	const { match } = rule;
	const score: [number, number, number] = [0, 0, 0]; // [env, cwd, file]
	let conditionsMet = 0;
	let totalConditions = 0;
	const logs: string[] = [];

	if (match.file !== undefined) {
		const patterns = Array.isArray(match.file) ? match.file : [match.file];
		if (patterns.length > 0) {
			let files: string[] = filesMemo ?? [];
			if (filesMemo === undefined) {
				try {
					files = fs.readdirSync(cwd);
				} catch {
					files = [];
				}
			}
			for (const pattern of patterns) {
				totalConditions++;
				const isMatch = picomatch(pattern);
				const passed = files.some((f) => isMatch(f));
				if (passed) {
					conditionsMet++;
					score[2]++;
				}
				logs.push(`file:${pattern} [${passed ? 'PASS' : 'FAIL'}]`);
			}
		}
	}

	if (match.cwd !== undefined) {
		const patterns = Array.isArray(match.cwd) ? match.cwd : [match.cwd];
		for (const pattern of patterns) {
			totalConditions++;
			let passed = false;
			try {
				const regex = new RE2(pattern);
				if (regex.test(cwd)) {
					conditionsMet++;
					score[1]++;
					passed = true;
				}
			} catch {
				// Invalid regex — treat as non-match
			}
			logs.push(`cwd:${pattern} [${passed ? 'PASS' : 'FAIL'}]`);
		}
	}

	if (match.env !== undefined) {
		const names = Array.isArray(match.env) ? match.env : [match.env];
		for (const name of names) {
			totalConditions++;
			const value = env[name];
			const passed = value !== undefined && value !== '';
			if (passed) {
				conditionsMet++;
				score[0]++;
			}
			logs.push(`env:${name} [${passed ? 'PASS' : 'FAIL'}]`);
		}
	}

	if (totalConditions === 0) {
		logs.push(`(always match) [PASS]`);
	}

	const matched =
		totalConditions === 0 ? true : conditionsMet === totalConditions;
	const finalScore: [number, number, number] =
		totalConditions === 0
			? [0, 0, 0]
			: conditionsMet === totalConditions
				? score
				: [0, 0, 0];

	return {
		matched,
		score: finalScore,
		totalConditions,
		logs,
	};
}

export function compareScores(
	a: [number, number, number],
	b: [number, number, number],
): number {
	for (let i = 0; i < 3; i++) {
		if (a[i] !== b[i]) {
			return a[i] - b[i];
		}
	}
	return 0; // Exactly equal specificities
}

export function findBestMatch(
	rules: Rule[],
	cwd: string,
	env: Record<string, string | undefined>,
	options?: FindBestMatchOptions,
): MatchResult {
	let best: MatchResult = null;
	let filesMemo: string[] | undefined;

	const isVerbose = options?.verbose ?? false;
	if (isVerbose) {
		console.error(
			`Evaluating alias "${options?.aliasName ?? 'unknown'}" (${rules.length} rules)`,
		);
	}

	for (let i = 0; i < rules.length; i++) {
		const rule = rules[i];
		if (rule.match.file !== undefined && filesMemo === undefined) {
			try {
				filesMemo = fs.readdirSync(cwd);
			} catch {
				filesMemo = [];
			}
		}

		const result = evaluateRule(rule, cwd, env, filesMemo);

		if (isVerbose) {
			const strLog = result.logs.join(' ');
			const status = result.matched
				? `(match, command: "${rule.command}")`
				: '(no match)';
			console.error(
				`  Rule ${i + 1}: ${strLog} → score ${result.score}/${result.totalConditions || 0} ${status}`,
			);
		}

		if (result.matched) {
			// >= means later rule wins on tie (CSS-style)
			if (best === null || compareScores(result.score, best.score) >= 0) {
				best = { command: rule.command, rule, score: result.score };
			}
		}
	}

	if (isVerbose) {
		if (best) {
			const bestIndex = rules.indexOf(best?.rule);
			console.error(
				`  Winner: Rule ${bestIndex + 1} (score [${best.score.join(',')}])`,
			);
		} else {
			console.error(`  Winner: none`);
		}
	}

	return best;
}
