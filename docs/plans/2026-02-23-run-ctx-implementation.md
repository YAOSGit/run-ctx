# run-ctx Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a globally-installed npm CLI that aliases commands based on cwd, file presence, and environment variables, with an Ink TUI editor.

**Architecture:** Two binaries in one package. `run-ctx` is a lean runner (no React) that loads JSON config, scores rules by specificity, and spawns the matched command. `run-ctx-editor` is an Ink/React TUI for CRUD management of aliases and rules. Shared code lives in `src/utils/` and `src/types/`.

**Tech Stack:** TypeScript, esbuild (dual entry points), Commander, Ink + React (editor only), Vitest, Biome.

**Design doc:** `docs/plans/2026-02-23-run-ctx-design.md`

---

### Task 1: Clean up — Remove all existing run-tui code

**Files:**
- Delete: `src/app/cli.tsx`, `src/app/index.tsx`, `src/app/providers.tsx`, `src/app/app.tsx` (if exists)
- Delete: `src/components/` (entire directory)
- Delete: `src/commands/` (entire directory)
- Delete: `src/hooks/` (entire directory)
- Delete: `src/providers/` (entire directory)
- Delete: `src/types/` (entire directory)
- Delete: `src/utils/` (entire directory)
- Delete: `e2e/` (entire directory)
- Delete: `examples/` (entire directory)
- Delete: `coverage/` (entire directory)
- Delete: `dist/` (entire directory)
- Delete: `docs/asciinema/` (if exists)

**Step 1: Remove all source directories**

```bash
rm -rf src/app src/components src/commands src/hooks src/providers src/types src/utils
rm -rf e2e examples coverage dist
```

**Step 2: Recreate empty directory structure**

```bash
mkdir -p src/app
mkdir -p src/components/AliasList
mkdir -p src/components/RuleEditor
mkdir -p src/components/RuleDetail
mkdir -p src/hooks
mkdir -p src/providers
mkdir -p src/types/Config
mkdir -p src/types/Rule
mkdir -p src/types/Alias
mkdir -p src/utils/config
mkdir -p src/utils/matcher
mkdir -p src/utils/executor
mkdir -p src/commands
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove all run-tui code, scaffold run-ctx directory structure"
```

---

### Task 2: Define shared types

**Files:**
- Create: `src/types/Config/index.ts`
- Create: `src/types/Rule/index.ts`
- Create: `src/types/Alias/index.ts`

**Step 1: Create Rule types**

```typescript
// src/types/Rule/index.ts

export type MatchCondition = {
	/** Glob pattern checked against files in cwd */
	file?: string;
	/** Regex pattern matched against full cwd path */
	cwd?: string;
	/** Environment variable name that must be set and non-empty */
	env?: string;
};

export type Rule = {
	match: MatchCondition;
	command: string;
};
```

**Step 2: Create Alias types**

```typescript
// src/types/Alias/index.ts
import type { Rule } from '../Rule/index.js';

export type Alias = {
	description?: string;
	rules: Rule[];
	fallback?: string | null;
};
```

**Step 3: Create Config types**

```typescript
// src/types/Config/index.ts
import type { Alias } from '../Alias/index.js';

export type Config = {
	aliases: Record<string, Alias>;
};
```

**Step 4: Commit**

```bash
git add src/types/
git commit -m "feat: add shared types for Config, Alias, and Rule"
```

---

### Task 3: Config utility — read, write, validate

**Files:**
- Create: `src/utils/config/index.ts`
- Test: `src/utils/config/config.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/utils/config/config.test.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../../types/Config/index.js';
import { getConfigPath, loadConfig, saveConfig } from './index.js';

describe('config', () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'run-ctx-test-'));
	});

	afterEach(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	describe('getConfigPath', () => {
		it('returns path under ~/.config/run-ctx/', () => {
			const configPath = getConfigPath();
			expect(configPath).toContain('run-ctx');
			expect(configPath).toEndWith('config.json');
		});
	});

	describe('loadConfig', () => {
		it('returns empty config when file does not exist', () => {
			const config = loadConfig(path.join(tmpDir, 'nonexistent.json'));
			expect(config).toEqual({ aliases: {} });
		});

		it('loads valid config from file', () => {
			const filePath = path.join(tmpDir, 'config.json');
			const expected: Config = {
				aliases: {
					dev: {
						description: 'Start dev server',
						rules: [{ match: { file: 'package.json' }, command: 'npm run dev' }],
					},
				},
			};
			fs.writeFileSync(filePath, JSON.stringify(expected));
			const config = loadConfig(filePath);
			expect(config).toEqual(expected);
		});

		it('returns empty config for invalid JSON', () => {
			const filePath = path.join(tmpDir, 'config.json');
			fs.writeFileSync(filePath, 'not json');
			const config = loadConfig(filePath);
			expect(config).toEqual({ aliases: {} });
		});
	});

	describe('saveConfig', () => {
		it('writes config to file', () => {
			const filePath = path.join(tmpDir, 'config.json');
			const config: Config = {
				aliases: {
					test: {
						rules: [{ match: { file: 'Cargo.toml' }, command: 'cargo test' }],
					},
				},
			};
			saveConfig(config, filePath);
			const raw = fs.readFileSync(filePath, 'utf-8');
			expect(JSON.parse(raw)).toEqual(config);
		});

		it('creates parent directories if they do not exist', () => {
			const filePath = path.join(tmpDir, 'nested', 'deep', 'config.json');
			saveConfig({ aliases: {} }, filePath);
			expect(fs.existsSync(filePath)).toBe(true);
		});
	});
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run -c vitest.unit.config.ts src/utils/config/config.test.ts
```

Expected: FAIL — module `./index.js` does not exist.

**Step 3: Write the implementation**

```typescript
// src/utils/config/index.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Config } from '../../types/Config/index.js';

const DEFAULT_CONFIG: Config = { aliases: {} };

export function getConfigPath(): string {
	const configDir =
		process.env['XDG_CONFIG_HOME'] || path.join(os.homedir(), '.config');
	return path.join(configDir, 'run-ctx', 'config.json');
}

export function loadConfig(filePath?: string): Config {
	const configPath = filePath ?? getConfigPath();

	if (!fs.existsSync(configPath)) {
		return { ...DEFAULT_CONFIG };
	}

	try {
		const raw = fs.readFileSync(configPath, 'utf-8');
		return JSON.parse(raw) as Config;
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

export function saveConfig(config: Config, filePath?: string): void {
	const configPath = filePath ?? getConfigPath();
	const dir = path.dirname(configPath);

	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run -c vitest.unit.config.ts src/utils/config/config.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/utils/config/
git commit -m "feat: add config read/write/validate utility with tests"
```

---

### Task 4: Matcher utility — rule evaluation + specificity scoring

**Files:**
- Create: `src/utils/matcher/index.ts`
- Test: `src/utils/matcher/matcher.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/utils/matcher/matcher.test.ts
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
			const rule: Rule = { match: { cwd: '/tmp/.*matcher' }, command: 'echo hi' };
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
	});
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run -c vitest.unit.config.ts src/utils/matcher/matcher.test.ts
```

Expected: FAIL — module `./index.js` does not exist.

**Step 3: Write the implementation**

```typescript
// src/utils/matcher/index.ts
import fs from 'node:fs';
import path from 'node:path';
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
		totalConditions++;
		// Simple glob: check if any file in cwd matches the pattern
		// For basic patterns like "package.json" or "*.sln", use fs + basic matching
		const pattern = match.file;
		const files = fs.readdirSync(cwd);
		const regex = new RegExp(
			`^${pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.')}$`,
		);
		if (files.some((f) => regex.test(f))) {
			score++;
		}
	}

	if (match.cwd !== undefined) {
		totalConditions++;
		try {
			const regex = new RegExp(match.cwd);
			if (regex.test(cwd)) {
				score++;
			}
		} catch {
			// Invalid regex — treat as non-match
		}
	}

	if (match.env !== undefined) {
		totalConditions++;
		const value = env[match.env];
		if (value !== undefined && value !== '') {
			score++;
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
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run -c vitest.unit.config.ts src/utils/matcher/matcher.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/utils/matcher/
git commit -m "feat: add rule matcher with specificity scoring and tests"
```

---

### Task 5: Executor utility — spawn matched command

**Files:**
- Create: `src/utils/executor/index.ts`
- Test: `src/utils/executor/executor.test.ts`

**Step 1: Write the failing tests**

```typescript
// src/utils/executor/executor.test.ts
import { describe, expect, it } from 'vitest';
import { buildCommandArgs, parseCommand } from './index.js';

describe('executor', () => {
	describe('parseCommand', () => {
		it('splits a simple command into program and args', () => {
			const result = parseCommand('npm run dev');
			expect(result).toEqual({ program: 'npm', args: ['run', 'dev'] });
		});

		it('handles a single-word command', () => {
			const result = parseCommand('ls');
			expect(result).toEqual({ program: 'ls', args: [] });
		});

		it('handles extra whitespace', () => {
			const result = parseCommand('  npm   run   dev  ');
			expect(result).toEqual({ program: 'npm', args: ['run', 'dev'] });
		});
	});

	describe('buildCommandArgs', () => {
		it('appends passthrough args', () => {
			const result = buildCommandArgs('npm run dev', ['--port', '3000']);
			expect(result).toEqual({
				program: 'npm',
				args: ['run', 'dev', '--port', '3000'],
			});
		});

		it('works with no passthrough args', () => {
			const result = buildCommandArgs('cargo test', []);
			expect(result).toEqual({ program: 'cargo', args: ['test'] });
		});
	});
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run -c vitest.unit.config.ts src/utils/executor/executor.test.ts
```

Expected: FAIL — module `./index.js` does not exist.

**Step 3: Write the implementation**

```typescript
// src/utils/executor/index.ts
import { spawnSync } from 'node:child_process';

export type ParsedCommand = {
	program: string;
	args: string[];
};

export function parseCommand(command: string): ParsedCommand {
	const parts = command.trim().split(/\s+/);
	return {
		program: parts[0],
		args: parts.slice(1),
	};
}

export function buildCommandArgs(
	command: string,
	passthroughArgs: string[],
): ParsedCommand {
	const parsed = parseCommand(command);
	return {
		program: parsed.program,
		args: [...parsed.args, ...passthroughArgs],
	};
}

export function execute(command: string, passthroughArgs: string[]): number {
	const { program, args } = buildCommandArgs(command, passthroughArgs);
	const result = spawnSync(program, args, {
		stdio: 'inherit',
		env: process.env,
		cwd: process.cwd(),
	});

	if (result.error) {
		console.error(`Failed to execute: ${command}`);
		console.error(result.error.message);
		return 1;
	}

	return result.status ?? 1;
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run -c vitest.unit.config.ts src/utils/executor/executor.test.ts
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/utils/executor/
git commit -m "feat: add command executor with arg parsing and tests"
```

---

### Task 6: Runner CLI (`run-ctx`)

**Files:**
- Create: `src/app/cli.ts`

**Step 1: Write the runner entry point**

```typescript
// src/app/cli.ts
#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { loadConfig } from '../utils/config/index.js';
import { execute } from '../utils/executor/index.js';
import { findBestMatch } from '../utils/matcher/index.js';

declare const __CLI_VERSION__: string;

function printVersion(): void {
	console.log(`run-ctx v${__CLI_VERSION__}`);
	console.log(`Node.js ${process.version}`);
	console.log(`Platform: ${process.platform} ${process.arch}`);
}

function printHelp(aliasNames: string[]): void {
	console.log('Usage: run-ctx <alias> [args...]');
	console.log('       run-ctx --list');
	console.log('       run-ctx --dry-run <alias>');
	console.log('       run-ctx --edit');
	console.log('');
	console.log('Options:');
	console.log('  --list       List all aliases and matched commands for current context');
	console.log('  --dry-run    Show what command would run without executing');
	console.log('  --edit       Launch the TUI editor (run-ctx-editor)');
	console.log('  --help       Show this help message');
	console.log('  --version    Show version information');

	if (aliasNames.length > 0) {
		console.log('');
		console.log('Available aliases:');
		for (const name of aliasNames) {
			console.log(`  ${name}`);
		}
	}
}

function printList(config: ReturnType<typeof loadConfig>): void {
	const cwd = process.cwd();
	const env = process.env;

	for (const [name, alias] of Object.entries(config.aliases)) {
		const match = findBestMatch(alias.rules, cwd, env);
		const desc = alias.description ? ` — ${alias.description}` : '';
		if (match) {
			console.log(`  ${name}${desc}`);
			console.log(`    → ${match.command} (score: ${match.score})`);
		} else if (alias.fallback) {
			console.log(`  ${name}${desc}`);
			console.log(`    → ${alias.fallback} (fallback)`);
		} else {
			console.log(`  ${name}${desc}`);
			console.log('    → (no match)');
		}
	}
}

function main(): void {
	const args = process.argv.slice(2);
	const config = loadConfig();
	const aliasNames = Object.keys(config.aliases);

	// No args → show help
	if (args.length === 0) {
		printHelp(aliasNames);
		process.exit(0);
	}

	const firstArg = args[0];

	// Check if first arg is a known alias
	const alias = config.aliases[firstArg];
	if (alias) {
		const passthroughArgs = args.slice(1);
		const cwd = process.cwd();
		const match = findBestMatch(alias.rules, cwd, process.env);

		if (match) {
			const exitCode = execute(match.command, passthroughArgs);
			process.exit(exitCode);
		} else if (alias.fallback) {
			const exitCode = execute(alias.fallback, passthroughArgs);
			process.exit(exitCode);
		} else {
			console.error(`No matching rule for alias "${firstArg}" in this context.`);
			console.error(`  cwd: ${cwd}`);
			console.error(`  rules checked: ${alias.rules.length}`);
			process.exit(1);
		}
		return;
	}

	// Not an alias → process as flags
	switch (firstArg) {
		case '--version':
		case '-v':
			printVersion();
			break;

		case '--help':
		case '-h':
			printHelp(aliasNames);
			break;

		case '--list':
		case '-l':
			printList(config);
			break;

		case '--dry-run': {
			const aliasName = args[1];
			if (!aliasName) {
				console.error('Usage: run-ctx --dry-run <alias>');
				process.exit(1);
			}
			const dryAlias = config.aliases[aliasName];
			if (!dryAlias) {
				console.error(`Unknown alias: "${aliasName}"`);
				process.exit(1);
			}
			const match = findBestMatch(dryAlias.rules, process.cwd(), process.env);
			if (match) {
				console.log(match.command);
			} else if (dryAlias.fallback) {
				console.log(dryAlias.fallback);
			} else {
				console.error(`No matching rule for "${aliasName}" in this context.`);
				process.exit(1);
			}
			break;
		}

		case '--edit':
		case '-e': {
			// Launch run-ctx-editor as a separate process
			const editorPath = path.resolve(
				path.dirname(new URL(import.meta.url).pathname),
				'editor-cli.js',
			);
			try {
				execFileSync('node', [editorPath], { stdio: 'inherit' });
			} catch {
				// Try as a global binary fallback
				try {
					execFileSync('run-ctx-editor', [], { stdio: 'inherit' });
				} catch {
					console.error('Could not launch run-ctx-editor.');
					process.exit(1);
				}
			}
			break;
		}

		default:
			console.error(`Unknown alias or option: "${firstArg}"`);
			console.error('Run "run-ctx --help" for usage information.');
			process.exit(1);
	}
}

main();
```

**Step 2: Commit**

```bash
git add src/app/cli.ts
git commit -m "feat: add run-ctx runner CLI entry point"
```

---

### Task 7: Update build config — esbuild dual entry points

**Files:**
- Modify: `esbuild.config.js`

**Step 1: Update esbuild to build both binaries**

```javascript
// esbuild.config.js
import { readFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import * as esbuild from 'esbuild';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = packageJson.version;

const requireShim = `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
`;

const sharedConfig = {
	bundle: true,
	platform: 'node',
	format: 'esm',
	minify: true,
	tsconfig: 'tsconfig.app.json',
	external: builtinModules.map((m) => `node:${m}`),
	banner: {
		js: requireShim,
	},
	define: {
		__CLI_VERSION__: JSON.stringify(version),
	},
	supported: {
		'top-level-await': true,
	},
	plugins: [
		{
			name: 'node-builtins-to-node-prefix',
			setup(build) {
				const filter = new RegExp(`^(${builtinModules.join('|')})$`);
				build.onResolve({ filter }, (args) => ({
					path: `node:${args.path}`,
					external: true,
				}));
			},
		},
		{
			name: 'stub-react-devtools',
			setup(build) {
				build.onResolve({ filter: /^react-devtools-core$/ }, () => ({
					path: 'react-devtools-core',
					namespace: 'stub',
				}));
				build.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
					contents: 'export default undefined;',
					loader: 'js',
				}));
			},
		},
	],
	mainFields: ['module', 'main'],
	conditions: ['import', 'node'],
};

// Build runner (lean, no React)
await esbuild.build({
	...sharedConfig,
	entryPoints: ['src/app/cli.ts'],
	outfile: 'dist/cli.js',
});

// Build editor (Ink/React TUI)
await esbuild.build({
	...sharedConfig,
	entryPoints: ['src/app/editor-cli.tsx'],
	outfile: 'dist/editor-cli.js',
});
```

**Step 2: Commit**

```bash
git add esbuild.config.js
git commit -m "feat: update esbuild config for dual binary output"
```

---

### Task 8: Update package.json

**Files:**
- Modify: `package.json`

**Step 1: Update package metadata, binaries, and dependencies**

Key changes:
- name: `run-ctx`
- description: updated
- bin: `{ "run-ctx": "dist/cli.js", "run-ctx-editor": "dist/editor-cli.js" }`
- Remove unused dependencies (node-pty, strip-ansi)
- Keep: chalk, commander (dependencies), ink, @inkjs/ui, react (devDependencies → dependencies for editor)
- keywords: updated

```json
{
	"name": "run-ctx",
	"version": "126.1.0",
	"description": "Context-aware command alias CLI — run the right command based on cwd, files, and env vars",
	"main": "dist/cli.js",
	"bin": {
		"run-ctx": "dist/cli.js",
		"run-ctx-editor": "dist/editor-cli.js"
	},
	"files": ["dist"],
	"keywords": ["cli", "alias", "context", "command-runner", "tui", "devtools"],
	"scripts": {
		"dev": "vitest --watch",
		"build": "node esbuild.config.js",
		"lint": "npm run lint:types && npm run lint:fix && npm run lint:format",
		"lint:check": "biome lint .",
		"lint:fix": "biome check . --write",
		"lint:format": "biome format . --write",
		"lint:types": "tsgo --noEmit -p tsconfig.app.json",
		"test": "npm run test:unit && npm run test:react",
		"test:unit": "vitest run -c vitest.unit.config.ts",
		"test:react": "vitest run -c vitest.react.config.ts",
		"prepublishOnly": "npm run lint:types && npm run lint:check && npm run test && npm run build"
	}
}
```

Note: Move `ink`, `@inkjs/ui`, and `react` from devDependencies to dependencies since the editor binary needs them at runtime. Keep `@types/react` in devDependencies.

**Step 2: Commit**

```bash
git add package.json
git commit -m "feat: update package.json for run-ctx with dual binaries"
```

---

### Task 9: Editor TUI — Entry point and main app shell

**Files:**
- Create: `src/app/editor-cli.tsx`
- Create: `src/app/app.tsx`

**Step 1: Create the editor entry point**

```tsx
// src/app/editor-cli.tsx
#!/usr/bin/env node
import { render } from 'ink';
import React from 'react';
import App from './app.js';

render(<App />);
```

**Step 2: Create the main app shell with screen routing**

```tsx
// src/app/app.tsx
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { loadConfig, saveConfig } from '../utils/config/index.js';
import type { Config } from '../types/Config/index.js';
import AliasList from '../components/AliasList/index.js';

type Screen =
	| { type: 'alias-list' }
	| { type: 'rule-editor'; aliasName: string }
	| { type: 'rule-detail'; aliasName: string; ruleIndex: number };

export default function App() {
	const [config, setConfig] = useState<Config>(() => loadConfig());
	const [screen, setScreen] = useState<Screen>({ type: 'alias-list' });

	const handleSave = (newConfig: Config) => {
		setConfig(newConfig);
		saveConfig(newConfig);
	};

	switch (screen.type) {
		case 'alias-list':
			return (
				<AliasList
					config={config}
					onSave={handleSave}
					onEditAlias={(name) => setScreen({ type: 'rule-editor', aliasName: name })}
				/>
			);
		case 'rule-editor':
			// Placeholder — implemented in Task 11
			return (
				<Box>
					<Text>Rule editor for: {screen.aliasName} (coming soon)</Text>
				</Box>
			);
		case 'rule-detail':
			// Placeholder — implemented in Task 12
			return (
				<Box>
					<Text>Rule detail (coming soon)</Text>
				</Box>
			);
	}
}
```

**Step 3: Commit**

```bash
git add src/app/editor-cli.tsx src/app/app.tsx
git commit -m "feat: add editor TUI entry point and app shell with screen routing"
```

---

### Task 10: Editor TUI — AliasList component

**Files:**
- Create: `src/components/AliasList/index.tsx`
- Test: `src/components/AliasList/AliasList.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/AliasList/AliasList.test.tsx
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { Config } from '../../types/Config/index.js';
import AliasList from './index.js';

describe('AliasList', () => {
	const baseConfig: Config = {
		aliases: {
			dev: {
				description: 'Start dev server',
				rules: [{ match: { file: 'package.json' }, command: 'npm run dev' }],
			},
			test: {
				rules: [{ match: { file: 'package.json' }, command: 'npm test' }],
			},
		},
	};

	it('renders alias names', () => {
		const { lastFrame } = render(
			<AliasList config={baseConfig} onSave={vi.fn()} onEditAlias={vi.fn()} />,
		);
		expect(lastFrame()).toContain('dev');
		expect(lastFrame()).toContain('test');
	});

	it('shows description when available', () => {
		const { lastFrame } = render(
			<AliasList config={baseConfig} onSave={vi.fn()} onEditAlias={vi.fn()} />,
		);
		expect(lastFrame()).toContain('Start dev server');
	});

	it('shows rule count', () => {
		const { lastFrame } = render(
			<AliasList config={baseConfig} onSave={vi.fn()} onEditAlias={vi.fn()} />,
		);
		expect(lastFrame()).toContain('1 rule');
	});
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run -c vitest.react.config.ts src/components/AliasList/AliasList.test.tsx
```

Expected: FAIL — module does not exist.

**Step 3: Write the component**

```tsx
// src/components/AliasList/index.tsx
import React, { useState } from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import type { Config } from '../../types/Config/index.js';

type Props = {
	config: Config;
	onSave: (config: Config) => void;
	onEditAlias: (name: string) => void;
};

export default function AliasList({ config, onSave, onEditAlias }: Props) {
	const { exit } = useApp();
	const aliasNames = Object.keys(config.aliases);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [isCreating, setIsCreating] = useState(false);
	const [newName, setNewName] = useState('');

	useInput((input, key) => {
		if (isCreating) {
			if (key.return) {
				if (newName.trim()) {
					const newConfig = {
						...config,
						aliases: {
							...config.aliases,
							[newName.trim()]: { rules: [] },
						},
					};
					onSave(newConfig);
				}
				setIsCreating(false);
				setNewName('');
			} else if (key.escape) {
				setIsCreating(false);
				setNewName('');
			} else if (key.backspace || key.delete) {
				setNewName((prev) => prev.slice(0, -1));
			} else if (input && !key.ctrl && !key.meta) {
				setNewName((prev) => prev + input);
			}
			return;
		}

		if (key.upArrow) {
			setSelectedIndex((prev) => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex((prev) => Math.min(aliasNames.length - 1, prev + 1));
		} else if (key.return && aliasNames.length > 0) {
			onEditAlias(aliasNames[selectedIndex]);
		} else if (input === 'n') {
			setIsCreating(true);
		} else if (input === 'd' && aliasNames.length > 0) {
			const nameToDelete = aliasNames[selectedIndex];
			const { [nameToDelete]: _, ...rest } = config.aliases;
			onSave({ ...config, aliases: rest });
			setSelectedIndex((prev) => Math.min(prev, aliasNames.length - 2));
		} else if (input === 'q' || key.escape) {
			exit();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					run-ctx editor
				</Text>
				<Text color="gray"> — Manage your command aliases</Text>
			</Box>

			{aliasNames.length === 0 ? (
				<Text color="gray">No aliases configured. Press 'n' to create one.</Text>
			) : (
				aliasNames.map((name, index) => {
					const alias = config.aliases[name];
					const ruleCount = alias.rules.length;
					const isSelected = index === selectedIndex;

					return (
						<Box key={name}>
							<Text color={isSelected ? 'cyan' : undefined}>
								{isSelected ? '❯ ' : '  '}
								<Text bold>{name}</Text>
								{alias.description ? (
									<Text color="gray"> — {alias.description}</Text>
								) : null}
								<Text color="yellow">
									{' '}
									({ruleCount} rule{ruleCount !== 1 ? 's' : ''})
								</Text>
							</Text>
						</Box>
					);
				})
			)}

			{isCreating ? (
				<Box marginTop={1}>
					<Text color="green">New alias name: </Text>
					<Text>{newName}</Text>
					<Text color="gray">█</Text>
				</Box>
			) : null}

			<Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
				<Text color="gray">
					↑↓ navigate · Enter edit · n new · d delete · q quit
				</Text>
			</Box>
		</Box>
	);
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run -c vitest.react.config.ts src/components/AliasList/AliasList.test.tsx
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/components/AliasList/
git commit -m "feat: add AliasList TUI component with CRUD and tests"
```

---

### Task 11: Editor TUI — RuleEditor component

**Files:**
- Create: `src/components/RuleEditor/index.tsx`
- Test: `src/components/RuleEditor/RuleEditor.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/RuleEditor/RuleEditor.test.tsx
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { Alias } from '../../types/Alias/index.js';
import RuleEditor from './index.js';

describe('RuleEditor', () => {
	const alias: Alias = {
		description: 'Start dev server',
		rules: [
			{ match: { file: 'package.json' }, command: 'npm run dev' },
			{ match: { file: 'composer.json' }, command: 'composer serve' },
		],
	};

	it('renders the alias name as header', () => {
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('dev');
	});

	it('renders all rules with their commands', () => {
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('npm run dev');
		expect(lastFrame()).toContain('composer serve');
	});

	it('shows match conditions for each rule', () => {
		const { lastFrame } = render(
			<RuleEditor
				aliasName="dev"
				alias={alias}
				onSave={vi.fn()}
				onBack={vi.fn()}
				onEditRule={vi.fn()}
			/>,
		);
		expect(lastFrame()).toContain('package.json');
		expect(lastFrame()).toContain('composer.json');
	});
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run -c vitest.react.config.ts src/components/RuleEditor/RuleEditor.test.tsx
```

**Step 3: Write the component**

```tsx
// src/components/RuleEditor/index.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Alias } from '../../types/Alias/index.js';

type Props = {
	aliasName: string;
	alias: Alias;
	onSave: (alias: Alias) => void;
	onBack: () => void;
	onEditRule: (index: number) => void;
};

function formatMatch(match: Record<string, string | undefined>): string {
	const parts: string[] = [];
	if (match.file) parts.push(`file: ${match.file}`);
	if (match.cwd) parts.push(`cwd: ${match.cwd}`);
	if (match.env) parts.push(`env: ${match.env}`);
	return parts.join(', ');
}

export default function RuleEditor({
	aliasName,
	alias,
	onSave,
	onBack,
	onEditRule,
}: Props) {
	const [selectedIndex, setSelectedIndex] = useState(0);

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex((prev) => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedIndex((prev) => Math.min(alias.rules.length - 1, prev + 1));
		} else if (key.return && alias.rules.length > 0) {
			onEditRule(selectedIndex);
		} else if (input === 'n') {
			const newRules = [...alias.rules, { match: {}, command: '' }];
			onSave({ ...alias, rules: newRules });
			// Jump to the new rule for editing
			onEditRule(newRules.length - 1);
		} else if (input === 'd' && alias.rules.length > 0) {
			const newRules = alias.rules.filter((_, i) => i !== selectedIndex);
			onSave({ ...alias, rules: newRules });
			setSelectedIndex((prev) => Math.min(prev, newRules.length - 1));
		} else if (input === 'j' && selectedIndex < alias.rules.length - 1) {
			// Move rule down
			const newRules = [...alias.rules];
			[newRules[selectedIndex], newRules[selectedIndex + 1]] = [
				newRules[selectedIndex + 1],
				newRules[selectedIndex],
			];
			onSave({ ...alias, rules: newRules });
			setSelectedIndex((prev) => prev + 1);
		} else if (input === 'J' && selectedIndex > 0) {
			// Move rule up
			const newRules = [...alias.rules];
			[newRules[selectedIndex], newRules[selectedIndex - 1]] = [
				newRules[selectedIndex - 1],
				newRules[selectedIndex],
			];
			onSave({ ...alias, rules: newRules });
			setSelectedIndex((prev) => prev - 1);
		} else if (key.escape || input === 'q') {
			onBack();
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="cyan">
					{aliasName}
				</Text>
				{alias.description ? (
					<Text color="gray"> — {alias.description}</Text>
				) : null}
			</Box>

			{alias.rules.length === 0 ? (
				<Text color="gray">No rules. Press 'n' to add one.</Text>
			) : (
				alias.rules.map((rule, index) => {
					const isSelected = index === selectedIndex;
					return (
						<Box key={index} flexDirection="column" marginBottom={1}>
							<Text color={isSelected ? 'cyan' : undefined}>
								{isSelected ? '❯ ' : '  '}
								<Text bold>→ {rule.command || '(empty command)'}</Text>
							</Text>
							<Text color="gray">
								{'    '}
								when: {formatMatch(rule.match) || '(no conditions)'}
							</Text>
						</Box>
					);
				})
			)}

			<Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
				<Text color="gray">
					↑↓ navigate · Enter edit · n new · d delete · j/J reorder · q/Esc back
				</Text>
			</Box>
		</Box>
	);
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run -c vitest.react.config.ts src/components/RuleEditor/RuleEditor.test.tsx
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/components/RuleEditor/
git commit -m "feat: add RuleEditor TUI component with reordering and tests"
```

---

### Task 12: Editor TUI — RuleDetail component

**Files:**
- Create: `src/components/RuleDetail/index.tsx`
- Test: `src/components/RuleDetail/RuleDetail.test.tsx`

**Step 1: Write the failing test**

```tsx
// src/components/RuleDetail/RuleDetail.test.tsx
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, expect, it, vi } from 'vitest';
import type { Rule } from '../../types/Rule/index.js';
import RuleDetail from './index.js';

describe('RuleDetail', () => {
	const rule: Rule = {
		match: { file: 'package.json', env: 'NODE_ENV' },
		command: 'npm run dev',
	};

	it('renders the command', () => {
		const { lastFrame } = render(
			<RuleDetail rule={rule} onSave={vi.fn()} onBack={vi.fn()} />,
		);
		expect(lastFrame()).toContain('npm run dev');
	});

	it('renders match conditions as editable fields', () => {
		const { lastFrame } = render(
			<RuleDetail rule={rule} onSave={vi.fn()} onBack={vi.fn()} />,
		);
		expect(lastFrame()).toContain('file');
		expect(lastFrame()).toContain('package.json');
		expect(lastFrame()).toContain('env');
		expect(lastFrame()).toContain('NODE_ENV');
	});
});
```

**Step 2: Run tests to verify they fail**

```bash
npx vitest run -c vitest.react.config.ts src/components/RuleDetail/RuleDetail.test.tsx
```

**Step 3: Write the component**

```tsx
// src/components/RuleDetail/index.tsx
import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { Rule, MatchCondition } from '../../types/Rule/index.js';

type Props = {
	rule: Rule;
	onSave: (rule: Rule) => void;
	onBack: () => void;
};

type Field = 'command' | 'file' | 'cwd' | 'env';

const FIELDS: { key: Field; label: string; hint: string }[] = [
	{ key: 'command', label: 'Command', hint: 'The command to execute (e.g. npm run dev)' },
	{ key: 'file', label: 'File (glob)', hint: 'File pattern to check in cwd (e.g. package.json)' },
	{ key: 'cwd', label: 'CWD (regex)', hint: 'Regex to match against cwd path' },
	{ key: 'env', label: 'Env var', hint: 'Environment variable that must be set' },
];

export default function RuleDetail({ rule, onSave, onBack }: Props) {
	const [selectedField, setSelectedField] = useState(0);
	const [editing, setEditing] = useState(false);
	const [editValue, setEditValue] = useState('');

	const getFieldValue = (field: Field): string => {
		if (field === 'command') return rule.command;
		return rule.match[field] ?? '';
	};

	const saveField = (field: Field, value: string) => {
		if (field === 'command') {
			onSave({ ...rule, command: value });
		} else {
			const newMatch: MatchCondition = { ...rule.match };
			if (value.trim() === '') {
				delete newMatch[field];
			} else {
				newMatch[field] = value;
			}
			onSave({ ...rule, match: newMatch });
		}
	};

	useInput((input, key) => {
		if (editing) {
			if (key.return) {
				saveField(FIELDS[selectedField].key, editValue);
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
			setSelectedField((prev) => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setSelectedField((prev) => Math.min(FIELDS.length - 1, prev + 1));
		} else if (key.return) {
			setEditing(true);
			setEditValue(getFieldValue(FIELDS[selectedField].key));
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

			{FIELDS.map((field, index) => {
				const isSelected = index === selectedField;
				const value = getFieldValue(field.key);
				const isEditing = editing && isSelected;

				return (
					<Box key={field.key} flexDirection="column" marginBottom={1}>
						<Box>
							<Text color={isSelected ? 'cyan' : 'white'}>
								{isSelected ? '❯ ' : '  '}
								<Text bold>{field.label}: </Text>
								{isEditing ? (
									<>
										<Text color="green">{editValue}</Text>
										<Text color="gray">█</Text>
									</>
								) : (
									<Text color={value ? 'white' : 'gray'}>
										{value || '(empty)'}
									</Text>
								)}
							</Text>
						</Box>
						{isSelected && !isEditing ? (
							<Text color="gray">{'    '}{field.hint}</Text>
						) : null}
					</Box>
				);
			})}

			<Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
				<Text color="gray">
					↑↓ navigate · Enter edit field · Esc save & back
				</Text>
			</Box>
		</Box>
	);
}
```

**Step 4: Run tests to verify they pass**

```bash
npx vitest run -c vitest.react.config.ts src/components/RuleDetail/RuleDetail.test.tsx
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add src/components/RuleDetail/
git commit -m "feat: add RuleDetail TUI component for editing match conditions"
```

---

### Task 13: Wire up screen routing in app.tsx

**Files:**
- Modify: `src/app/app.tsx`

**Step 1: Replace placeholder screens with real components**

Update `app.tsx` to import and use `RuleEditor` and `RuleDetail`, wire up all navigation callbacks (onEditRule, onBack, onSave) so the full CRUD flow works: AliasList → RuleEditor → RuleDetail → back.

The save flow should update the config state and persist to disk via `saveConfig()` on every change.

**Step 2: Commit**

```bash
git add src/app/app.tsx
git commit -m "feat: wire up full screen routing for editor TUI"
```

---

### Task 14: Install dependencies and verify build

**Step 1: Install any missing dependencies**

```bash
npm install
```

**Step 2: Run the full build**

```bash
npm run build
```

Expected: Two files created: `dist/cli.js` and `dist/editor-cli.js`.

**Step 3: Run all tests**

```bash
npm test
```

Expected: All tests pass.

**Step 4: Verify the runner works**

```bash
# Create a test config
mkdir -p ~/.config/run-ctx
echo '{"aliases":{"hello":{"rules":[{"match":{},"command":"echo hello world"}]}}}' > ~/.config/run-ctx/config.json

# Test the runner
node dist/cli.js hello
# Expected output: hello world

node dist/cli.js --list
# Expected: lists "hello" alias

node dist/cli.js --dry-run hello
# Expected: echo hello world
```

**Step 5: Verify the editor launches**

```bash
node dist/editor-cli.js
# Expected: TUI launches showing "hello" alias
```

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: verify full build and integration of run-ctx"
```

---

### Task 15: Clean up README and docs

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`

**Step 1: Replace README content**

Write a new README for run-ctx covering: overview, installation, usage examples, config format, TUI editor usage, and keyboard shortcuts.

**Step 2: Reset CHANGELOG**

Clear old entries, start fresh with the initial release.

**Step 3: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: replace run-tui docs with run-ctx documentation"
```
