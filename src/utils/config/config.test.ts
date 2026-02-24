import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
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
			expect(configPath.endsWith('config.json')).toBe(true);
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
						rules: [
							{ match: { file: 'package.json' }, command: 'npm run dev' },
						],
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
