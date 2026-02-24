import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Rule } from '../../types/Rule/index.js';
import { evaluateRule, findBestMatch } from './index.js';

describe('matcher', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-matcher-'));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	describe('evaluateRule', () => {
		it('matches when file exists in cwd (glob)', () => {
			fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
			const rule: Rule = { match: { file: 'package.json' }, command: 'npm run dev' };
			const result = evaluateRule(rule, tmpDir, process.env);
			expect(result).toEqual({ matched: true, score: 1 });
		});

		it('does not match when file is absent', () => {
			const rule: Rule = { match: { file: 'package.json' }, command: 'npm run dev' };
			const result = evaluateRule(rule, tmpDir, process.env);
			expect(result).toEqual({ matched: false, score: 0 });
		});

		it('matches cwd with regex', () => {
			const rule: Rule = { match: { cwd: '.*run-ctx-matcher' }, command: 'echo hi' };
			const result = evaluateRule(rule, tmpDir, process.env);
			expect(result).toEqual({ matched: true, score: 1 });
		});

		it('does not match cwd when regex fails', () => {
			const rule: Rule = { match: { cwd: '/nonexistent/.*' }, command: 'echo hi' };
			const result = evaluateRule(rule, tmpDir, process.env);
			expect(result).toEqual({ matched: false, score: 0 });
		});

		it('matches when env var is set', () => {
			const rule: Rule = { match: { env: 'HOME' }, command: 'echo hi' };
			const result = evaluateRule(rule, tmpDir, process.env);
			expect(result).toEqual({ matched: true, score: 1 });
		});

		it('does not match when env var is not set', () => {
			const rule: Rule = { match: { env: 'UNLIKELY_VAR_12345' }, command: 'echo hi' };
			const result = evaluateRule(rule, tmpDir, {});
			expect(result).toEqual({ matched: false, score: 0 });
		});

		it('scores multiple conditions (2 points for file + env)', () => {
			fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
			const rule: Rule = { match: { file: 'package.json', env: 'HOME' }, command: 'npm test' };
			const result = evaluateRule(rule, tmpDir, process.env);
			expect(result).toEqual({ matched: true, score: 2 });
		});

		it('fails if any condition misses (partial match)', () => {
			const rule: Rule = { match: { file: 'package.json', env: 'HOME' }, command: 'npm test' };
			// file does not exist
			const result = evaluateRule(rule, tmpDir, process.env);
			expect(result).toEqual({ matched: false, score: 0 });
		});

		describe('array conditions (AND)', () => {
			it('matches when all file patterns exist (AND)', () => {
				fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
				fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
				const rule: Rule = {
					match: { file: ['package.json', 'pnpm-lock.yaml'] },
					command: 'pnpm dev',
				};
				const result = evaluateRule(rule, tmpDir, process.env);
				expect(result).toEqual({ matched: true, score: 2 });
			});

			it('fails when one file pattern is missing (AND)', () => {
				fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
				const rule: Rule = {
					match: { file: ['package.json', 'pnpm-lock.yaml'] },
					command: 'pnpm dev',
				};
				const result = evaluateRule(rule, tmpDir, process.env);
				expect(result).toEqual({ matched: false, score: 0 });
			});

			it('matches when all cwd patterns match (AND)', () => {
				const rule: Rule = {
					match: { cwd: ['.*run-ctx-matcher', '^/.*'] },
					command: 'echo hi',
				};
				const result = evaluateRule(rule, tmpDir, process.env);
				expect(result).toEqual({ matched: true, score: 2 });
			});

			it('fails when one cwd pattern does not match (AND)', () => {
				const rule: Rule = {
					match: { cwd: ['.*run-ctx-matcher', '/nonexistent/.*'] },
					command: 'echo hi',
				};
				const result = evaluateRule(rule, tmpDir, process.env);
				expect(result).toEqual({ matched: false, score: 0 });
			});

			it('matches when all env vars are set (AND)', () => {
				const rule: Rule = {
					match: { env: ['HOME', 'PATH'] },
					command: 'echo hi',
				};
				const result = evaluateRule(rule, tmpDir, process.env);
				expect(result).toEqual({ matched: true, score: 2 });
			});

			it('fails when one env var is missing (AND)', () => {
				const rule: Rule = {
					match: { env: ['HOME', 'UNLIKELY_VAR_99999'] },
					command: 'echo hi',
				};
				const result = evaluateRule(rule, tmpDir, {});
				expect(result).toEqual({ matched: false, score: 0 });
			});

			it('scores array + single across condition types', () => {
				fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
				fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
				const rule: Rule = {
					match: { file: ['package.json', 'pnpm-lock.yaml'], env: 'HOME' },
					command: 'pnpm dev',
				};
				const result = evaluateRule(rule, tmpDir, process.env);
				expect(result).toEqual({ matched: true, score: 3 });
			});

			it('treats empty array as no condition (no match)', () => {
				const rule: Rule = {
					match: { file: [] },
					command: 'echo hi',
				};
				const result = evaluateRule(rule, tmpDir, process.env);
				expect(result).toEqual({ matched: false, score: 0 });
			});
		});
	});

	describe('findBestMatch', () => {
		it('returns the rule with highest specificity', () => {
			fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
			const rules: Rule[] = [
				{ match: { file: 'package.json' }, command: 'npm run dev' },
				{ match: { file: 'package.json', env: 'HOME' }, command: 'npm run dev:full' },
			];
			const result = findBestMatch(rules, tmpDir, process.env);
			expect(result).toEqual({ command: 'npm run dev:full', rule: rules[1], score: 2 });
		});

		it('on tie, later rule wins', () => {
			fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
			fs.writeFileSync(path.join(tmpDir, 'tsconfig.json'), '{}');
			const rules: Rule[] = [
				{ match: { file: 'package.json' }, command: 'first' },
				{ match: { file: 'tsconfig.json' }, command: 'second' },
			];
			const result = findBestMatch(rules, tmpDir, process.env);
			expect(result?.command).toBe('second');
		});

		it('returns null when no rules match', () => {
			const rules: Rule[] = [
				{ match: { file: 'Cargo.toml' }, command: 'cargo run' },
			];
			const result = findBestMatch(rules, tmpDir, process.env);
			expect(result).toBeNull();
		});

		it('returns null for empty rules array', () => {
			const result = findBestMatch([], tmpDir, process.env);
			expect(result).toBeNull();
		});

		it('array condition (higher score) beats single string condition', () => {
			fs.writeFileSync(path.join(tmpDir, 'package.json'), '{}');
			fs.writeFileSync(path.join(tmpDir, 'pnpm-lock.yaml'), '');
			const rules: Rule[] = [
				{ match: { file: 'package.json' }, command: 'npm run dev' },
				{ match: { file: ['package.json', 'pnpm-lock.yaml'] }, command: 'pnpm dev' },
			];
			const result = findBestMatch(rules, tmpDir, process.env);
			expect(result).toEqual({ command: 'pnpm dev', rule: rules[1], score: 2 });
		});
	});
});
