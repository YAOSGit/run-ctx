# Multi-Condition AND Matching + Sub-Command Aliases — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) Allow `file`, `cwd`, and `env` match conditions to accept arrays (AND semantics), where each matched item scores +1. (2) Support dot-notation sub-command aliases (`run-ctx foo bar` → looks up `foo.bar` then falls back to `foo`).

**Architecture:** Widen `MatchCondition` fields from `string` to `string | string[]`. Normalize to arrays in the evaluator. TUI editor gets multi-entry list editing. CLI gets greedy dot-notation alias resolution with fallback to parent.

**Tech Stack:** TypeScript, Vitest, Ink (React-based TUI), ink-testing-library

---

### Task 1: Widen `MatchCondition` type

**Files:**
- Modify: `src/types/Rule/index.ts:1-8`

**Step 1: Update the type definition**

Replace the full contents of `src/types/Rule/index.ts` with:

```ts
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
};
```

**Step 2: Run type check to verify no compile errors**

Run: `npx tsgo --noEmit -p tsconfig.app.json`
Expected: No errors (widening a type from `string` to `string | string[]` is backward-compatible at the type level, but callers that assume `string` will need updating — we handle that in Task 2 and Task 4).

**Step 3: Commit**

```bash
git add src/types/Rule/index.ts
git commit -m "feat: widen MatchCondition fields to accept string | string[]"
```

---

### Task 2: Add array AND tests for the matcher

**Files:**
- Modify: `src/utils/matcher/matcher.test.ts`

**Step 1: Write failing tests for array file conditions**

Add the following tests inside the `describe('evaluateRule', ...)` block, after the existing tests (after line 69):

```ts
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
					match: { cwd: ['.*run-ctx-matcher', '.*tmp.*'] },
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
```

**Step 2: Add a findBestMatch test for array scoring**

Add inside the `describe('findBestMatch', ...)` block, after the existing tests (after line 105):

```ts
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
```

**Step 3: Run the tests to verify they FAIL**

Run: `npx vitest run -c vitest.unit.config.ts src/utils/matcher/matcher.test.ts`
Expected: FAIL — the evaluator does not handle arrays yet.

**Step 4: Commit the failing tests**

```bash
git add src/utils/matcher/matcher.test.ts
git commit -m "test: add array AND condition tests for matcher (currently failing)"
```

---

### Task 3: Implement array handling in evaluateRule

**Files:**
- Modify: `src/utils/matcher/index.ts:15-60`

**Step 1: Implement the array-aware evaluator**

Replace the `evaluateRule` function (lines 15-60) with:

```ts
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
```

Key changes:
- Each condition normalizes to an array via `Array.isArray(x) ? x : [x]`
- Loop over each item, incrementing `totalConditions` and `score` per item
- `readdirSync` is called once and reused for all file patterns
- Empty arrays (`[]`) result in 0 totalConditions for that field — same as undefined

**Step 2: Run all matcher tests to verify they PASS**

Run: `npx vitest run -c vitest.unit.config.ts src/utils/matcher/matcher.test.ts`
Expected: ALL PASS (both existing single-string tests and new array tests)

**Step 3: Run full unit test suite to verify no regressions**

Run: `npm run test:unit`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/utils/matcher/index.ts
git commit -m "feat: handle array AND conditions in evaluateRule"
```

---

### Task 4: Update TUI RuleDetail to support multi-entry editing

**Files:**
- Modify: `src/components/RuleDetail/index.tsx`

**Step 1: Write failing render test for array display**

Add to `src/components/RuleDetail/RuleDetail.test.tsx`, after the existing tests:

```tsx
	it('renders array match conditions as numbered list', () => {
		const arrayRule: Rule = {
			match: { file: ['package.json', 'pnpm-lock.yaml'] },
			command: 'pnpm dev',
		};
		const { lastFrame } = render(
			<RuleDetail rule={arrayRule} onSave={vi.fn()} onBack={vi.fn()} />,
		);
		expect(lastFrame()).toContain('1. package.json');
		expect(lastFrame()).toContain('2. pnpm-lock.yaml');
	});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run -c vitest.react.config.ts src/components/RuleDetail/RuleDetail.test.tsx`
Expected: FAIL — current component renders the array as-is (e.g., `package.json,pnpm-lock.yaml`)

**Step 3: Implement multi-entry RuleDetail component**

Replace the entire contents of `src/components/RuleDetail/index.tsx` with:

```tsx
import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { MatchCondition, Rule } from '../../types/Rule/index.js';

type Props = {
	rule: Rule;
	onSave: (rule: Rule) => void;
	onBack: () => void;
};

type Field = 'command' | 'file' | 'cwd' | 'env';

const FIELDS: { key: Field; label: string; hint: string }[] = [
	{
		key: 'command',
		label: 'command',
		hint: 'The command to execute (e.g. npm run dev)',
	},
	{
		key: 'file',
		label: 'file (glob)',
		hint: 'File pattern to check in cwd. [a]dd [d]elete [Enter]edit',
	},
	{
		key: 'cwd',
		label: 'cwd (regex)',
		hint: 'Regex to match against cwd path. [a]dd [d]elete [Enter]edit',
	},
	{
		key: 'env',
		label: 'env var',
		hint: 'Environment variable that must be set. [a]dd [d]elete [Enter]edit',
	},
];

function getEntries(rule: Rule, field: Field): string[] {
	if (field === 'command') return [rule.command];
	const value = rule.match[field];
	if (value === undefined) return [];
	return Array.isArray(value) ? value : [value];
}

function setEntries(rule: Rule, field: Field, entries: string[]): Rule {
	if (field === 'command') {
		return { ...rule, command: entries[0] ?? '' };
	}
	const newMatch: MatchCondition = { ...rule.match };
	const filtered = entries.filter((e) => e.trim() !== '');
	if (filtered.length === 0) {
		delete newMatch[field];
	} else if (filtered.length === 1) {
		newMatch[field] = filtered[0];
	} else {
		newMatch[field] = filtered;
	}
	return { ...rule, match: newMatch };
}

export default function RuleDetail({ rule, onSave, onBack }: Props) {
	const [selectedField, setSelectedField] = useState(0);
	const [selectedEntry, setSelectedEntry] = useState(0);
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState('');

	const currentField = FIELDS[selectedField].key;
	const entries = getEntries(rule, currentField);

	useInput((input, key) => {
		if (editing) {
			if (key.return) {
				const updated = [...entries];
				updated[selectedEntry] = editValue;
				onSave(setEntries(rule, currentField, updated));
				setEditing(false);
			} else if (key.escape) {
				setEditing(false);
			} else if (key.backspace || key.delete) {
				setEditValue((prev) => prev.slice(0, -1));
			} else if (input && !key.ctrl && !key.meta) {
				setEditValue((prev) => prev + input);
			}
			return;
		}

		if (key.upArrow) {
			if (selectedEntry > 0) {
				setSelectedEntry((prev) => prev - 1);
			} else {
				const prevField = Math.max(0, selectedField - 1);
				setSelectedField(prevField);
				const prevEntries = getEntries(rule, FIELDS[prevField].key);
				setSelectedEntry(Math.max(0, prevEntries.length - 1));
			}
		} else if (key.downArrow) {
			if (selectedEntry < entries.length - 1) {
				setSelectedEntry((prev) => prev + 1);
			} else {
				const nextField = Math.min(FIELDS.length - 1, selectedField + 1);
				if (nextField !== selectedField) {
					setSelectedField(nextField);
					setSelectedEntry(0);
				}
			}
		} else if (key.return) {
			if (entries.length > 0) {
				setEditing(true);
				setEditValue(entries[selectedEntry] ?? '');
			} else {
				// No entries — treat Enter as add
				const updated = [...entries, ''];
				onSave(setEntries(rule, currentField, updated));
				setSelectedEntry(updated.length - 1);
				setEditing(true);
				setEditValue('');
			}
		} else if (input === 'a' && currentField !== 'command') {
			const updated = [...entries, ''];
			onSave(setEntries(rule, currentField, updated));
			setSelectedEntry(updated.length - 1);
			setEditing(true);
			setEditValue('');
		} else if (input === 'd' && currentField !== 'command' && entries.length > 0) {
			const updated = entries.filter((_, i) => i !== selectedEntry);
			onSave(setEntries(rule, currentField, updated));
			setSelectedEntry(Math.max(0, selectedEntry - 1));
		} else if (key.escape || input === 'q') {
			onBack();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Edit Rule
				</Text>
			</Box>

			{FIELDS.map((field, fieldIndex) => {
				const isActiveField = fieldIndex === selectedField;
				const fieldEntries = getEntries(rule, field.key);

				return (
					<Box key={field.key} flexDirection="column" marginBottom={1}>
						<Box>
							<Text color={isActiveField ? 'cyan' : 'white'}>
								{isActiveField ? '> ' : '  '}
								<Text bold>{field.label}: </Text>
							</Text>
						</Box>

						{fieldEntries.length === 0 ? (
							<Box>
								<Text color="gray">{'    (empty)'}</Text>
							</Box>
						) : (
							fieldEntries.map((entry, entryIndex) => {
								const isActiveEntry =
									isActiveField && entryIndex === selectedEntry;
								const isEditing = editing && isActiveEntry;
								const showNumber = field.key !== 'command';

								return (
									<Box key={`${field.key}-${entryIndex}`}>
										<Text color={isActiveEntry ? 'green' : 'white'}>
											{'    '}
											{showNumber ? `${entryIndex + 1}. ` : ''}
											{isEditing ? (
												<>
													<Text color="green">{editValue}</Text>
													<Text color="gray">|</Text>
												</>
											) : (
												<Text>{entry || '(empty)'}</Text>
											)}
										</Text>
									</Box>
								);
							})
						)}

						{isActiveField && !editing ? (
							<Text color="gray">
								{'    '}
								{field.hint}
							</Text>
						) : null}
					</Box>
				);
			})}

			<Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
				<Text color="gray">
					{'\u2191\u2193'} navigate {'\u00B7'} Enter edit {'\u00B7'} a add {'\u00B7'} d
					delete {'\u00B7'} Esc back
				</Text>
			</Box>
		</Box>
	);
}
```

**Step 4: Run tests to verify both existing and new tests pass**

Run: `npx vitest run -c vitest.react.config.ts src/components/RuleDetail/RuleDetail.test.tsx`
Expected: ALL PASS

**Step 5: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/components/RuleDetail/index.tsx src/components/RuleDetail/RuleDetail.test.tsx
git commit -m "feat: multi-entry list editing for array conditions in TUI"
```

---

### Task 5: Add resolveAlias utility with tests

**Files:**
- Create: `src/utils/resolver/index.ts`
- Create: `src/utils/resolver/resolver.test.ts`

**Step 1: Write failing tests for resolveAlias**

Create `src/utils/resolver/resolver.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Alias } from '../../types/Alias/index.js';
import { resolveAlias } from './index.js';

const makeAlias = (desc: string): Alias => ({
	description: desc,
	rules: [{ match: {}, command: `echo ${desc}` }],
});

describe('resolveAlias', () => {
	it('resolves exact single-segment alias', () => {
		const aliases = { foo: makeAlias('foo') };
		const result = resolveAlias(aliases, ['foo']);
		expect(result).toEqual({
			alias: aliases.foo,
			aliasName: 'foo',
			passthroughArgs: [],
		});
	});

	it('resolves dot-notation sub-command (foo.bar)', () => {
		const aliases = {
			foo: makeAlias('foo'),
			'foo.bar': makeAlias('foo.bar'),
		};
		const result = resolveAlias(aliases, ['foo', 'bar']);
		expect(result).toEqual({
			alias: aliases['foo.bar'],
			aliasName: 'foo.bar',
			passthroughArgs: [],
		});
	});

	it('falls back to parent when sub-command not found', () => {
		const aliases = { foo: makeAlias('foo') };
		const result = resolveAlias(aliases, ['foo', 'bar']);
		expect(result).toEqual({
			alias: aliases.foo,
			aliasName: 'foo',
			passthroughArgs: ['bar'],
		});
	});

	it('resolves deepest match with unlimited depth', () => {
		const aliases = {
			foo: makeAlias('foo'),
			'foo.bar': makeAlias('foo.bar'),
			'foo.bar.baz': makeAlias('foo.bar.baz'),
		};
		const result = resolveAlias(aliases, ['foo', 'bar', 'baz']);
		expect(result).toEqual({
			alias: aliases['foo.bar.baz'],
			aliasName: 'foo.bar.baz',
			passthroughArgs: [],
		});
	});

	it('falls back to mid-level when deepest not found', () => {
		const aliases = {
			foo: makeAlias('foo'),
			'foo.bar': makeAlias('foo.bar'),
		};
		const result = resolveAlias(aliases, ['foo', 'bar', 'baz']);
		expect(result).toEqual({
			alias: aliases['foo.bar'],
			aliasName: 'foo.bar',
			passthroughArgs: ['baz'],
		});
	});

	it('returns null when no alias matches at all', () => {
		const aliases = { bar: makeAlias('bar') };
		const result = resolveAlias(aliases, ['foo']);
		expect(result).toBeNull();
	});

	it('preserves remaining args as passthrough', () => {
		const aliases = { 'foo.bar': makeAlias('foo.bar') };
		const result = resolveAlias(aliases, ['foo', 'bar', 'x', 'y']);
		expect(result).toEqual({
			alias: aliases['foo.bar'],
			aliasName: 'foo.bar',
			passthroughArgs: ['x', 'y'],
		});
	});
});
```

**Step 2: Run tests to verify they FAIL**

Run: `npx vitest run -c vitest.unit.config.ts src/utils/resolver/resolver.test.ts`
Expected: FAIL — module does not exist yet.

**Step 3: Implement resolveAlias**

Create `src/utils/resolver/index.ts`:

```ts
import type { Alias } from '../../types/Alias/index.js';

export type ResolveResult = {
	alias: Alias;
	aliasName: string;
	passthroughArgs: string[];
} | null;

export function resolveAlias(
	aliases: Record<string, Alias>,
	args: string[],
): ResolveResult {
	// Greedy: try longest dot-joined key first, then shrink
	for (let consumed = args.length; consumed >= 1; consumed--) {
		const candidate = args.slice(0, consumed).join('.');
		const alias = aliases[candidate];
		if (alias) {
			return {
				alias,
				aliasName: candidate,
				passthroughArgs: args.slice(consumed),
			};
		}
	}
	return null;
}
```

**Step 4: Run tests to verify they PASS**

Run: `npx vitest run -c vitest.unit.config.ts src/utils/resolver/resolver.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/utils/resolver/index.ts src/utils/resolver/resolver.test.ts
git commit -m "feat: add resolveAlias with greedy dot-notation lookup"
```

---

### Task 6: Integrate resolveAlias into CLI

**Files:**
- Modify: `src/app/cli.ts:60-95`

**Step 1: Update CLI to use resolveAlias**

In `src/app/cli.ts`, add the import at the top:

```ts
import { resolveAlias } from '../utils/resolver/index.js';
```

Then replace the alias lookup block in `main()` (lines 71-95) with:

```ts
	const firstArg = args[0];

	// Try greedy dot-notation resolution: foo.bar.baz → foo.bar → foo
	const resolved = resolveAlias(config.aliases, args);
	if (resolved) {
		const { alias, passthroughArgs } = resolved;
		const cwd = process.cwd();
		const match = findBestMatch(alias.rules, cwd, process.env);

		if (match) {
			const exitCode = execute(match.command, passthroughArgs);
			process.exit(exitCode);
		} else if (alias.fallback) {
			const exitCode = execute(alias.fallback, passthroughArgs);
			process.exit(exitCode);
		} else {
			console.error(
				`No matching rule for alias "${resolved.aliasName}" in this context.`,
			);
			console.error(`  cwd: ${cwd}`);
			console.error(`  rules checked: ${alias.rules.length}`);
			process.exit(1);
		}
		return;
	}
```

Keep the existing switch statement for flags (`--version`, `--help`, etc.) unchanged. The `firstArg` variable is still needed for the switch default case.

**Step 2: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 3: Manual smoke test**

Run: `npm run build && node dist/cli.js --help`
Expected: Shows help output with usage info

**Step 4: Commit**

```bash
git add src/app/cli.ts
git commit -m "feat: integrate dot-notation sub-command resolution into CLI"
```

---

### Task 7: Final verification and build

**Files:** None (verification only)

**Step 1: Run full lint + type check**

Run: `npm run lint:types`
Expected: No errors

**Step 2: Run biome lint**

Run: `npm run lint:check`
Expected: No errors (or only pre-existing ones)

**Step 3: Run full test suite**

Run: `npm test`
Expected: ALL PASS

**Step 4: Build**

Run: `npm run build`
Expected: Build succeeds, `dist/` is updated

**Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: final build for multi-condition AND matching + sub-command aliases"
```
