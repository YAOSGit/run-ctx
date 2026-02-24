import fs from 'node:fs';
import type { Rule } from '../../types/Rule/index.js';

export type EvalResult = {
	matched: boolean;
	score: number;
};

export type MatchResult = {
	command: string;
	rule: Rule;
	score: number;
} | null;

export function evaluateRule(
	rule: Rule,
	cwd: string,
	env: Record<string, string | undefined>,
): EvalResult {
	const { match } = rule;
	let score = 0;
	let totalConditions = 0;

	if (match.file !== undefined) {
		const patterns = Array.isArray(match.file) ? match.file : [match.file];
		if (patterns.length > 0) {
			const files = fs.readdirSync(cwd);
			for (const pattern of patterns) {
				totalConditions++;
				const regex = new RegExp(
					`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
				);
				if (files.some((f) => regex.test(f))) {
					score++;
				}
			}
		}
	}

	if (match.cwd !== undefined) {
		const patterns = Array.isArray(match.cwd) ? match.cwd : [match.cwd];
		for (const pattern of patterns) {
			totalConditions++;
			try {
				const regex = new RegExp(pattern);
				if (regex.test(cwd)) {
					score++;
				}
			} catch {
				// Invalid regex — treat as non-match
			}
		}
	}

	if (match.env !== undefined) {
		const names = Array.isArray(match.env) ? match.env : [match.env];
		for (const name of names) {
			totalConditions++;
			const value = env[name];
			if (value !== undefined && value !== '') {
				score++;
			}
		}
	}

	return {
		matched: totalConditions > 0 && score === totalConditions,
		score: totalConditions > 0 && score === totalConditions ? score : 0,
	};
}

export function findBestMatch(
	rules: Rule[],
	cwd: string,
	env: Record<string, string | undefined>,
): MatchResult {
	let best: MatchResult = null;

	for (const rule of rules) {
		const result = evaluateRule(rule, cwd, env);
		if (result.matched) {
			// >= means later rule wins on tie (CSS-style)
			if (best === null || result.score >= best.score) {
				best = { command: rule.command, rule, score: result.score };
			}
		}
	}

	return best;
}
