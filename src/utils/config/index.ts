import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { INITIAL_CONFIG } from '../../app/initialConfig.js';
import type { Config } from '../../types/Config/index.js';

const DEFAULT_CONFIG: Config = { version: 2, aliases: {} };

function validateConfig(rawObj: unknown): asserts rawObj is Config {
	if (!rawObj || typeof rawObj !== 'object') {
		throw new Error('Config root must be an object');
	}

	const config = rawObj as Record<string, unknown>;
	if (!config.aliases || typeof config.aliases !== 'object') {
		throw new Error('Config must have an "aliases" object');
	}

	const aliases = config.aliases as Record<string, unknown>;
	for (const [name, aliasData] of Object.entries(aliases)) {
		if (!aliasData || typeof aliasData !== 'object') {
			throw new Error(`Alias "${name}" must be an object`);
		}
		const alias = aliasData as Record<string, unknown>;

		if (!Array.isArray(alias.rules)) {
			throw new Error(`Alias "${name}" must have a "rules" array`);
		}

		for (const [i, ruleData] of alias.rules.entries()) {
			if (!ruleData || typeof ruleData !== 'object') {
				throw new Error(`Rule ${i} in alias "${name}" must be an object`);
			}
			const rule = ruleData as Record<string, unknown>;
			if (typeof rule.command !== 'string') {
				throw new Error(
					`Rule ${i} in alias "${name}" must have a "command" string`,
				);
			}
			if (!rule.match || typeof rule.match !== 'object') {
				throw new Error(
					`Rule ${i} in alias "${name}" must have a "match" object`,
				);
			}

			const match = rule.match as Record<string, unknown>;
			for (const field of ['file', 'cwd', 'env'] as const) {
				const val = match[field];
				if (val === undefined) continue;
				if (Array.isArray(val)) {
					match[field] = val.map((v) => String(v));
				} else {
					match[field] = String(val);
				}
			}
			if (rule.shell !== undefined && typeof rule.shell !== 'boolean') {
				throw new Error(
					`Rule ${i} in alias "${name}" has invalid "shell" (must be boolean)`,
				);
			}
		}

		if (alias.shell !== undefined && typeof alias.shell !== 'boolean') {
			throw new Error(`Alias "${name}" has invalid "shell" (must be boolean)`);
		}
	}
}

export function getConfigPath(): string {
	const configDir =
		process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
	return path.join(configDir, 'run-ctx', 'config.json');
}

export function loadConfig(filePath?: string): Config {
	const configPath = filePath ?? getConfigPath();

	if (!fs.existsSync(configPath)) {
		return { ...DEFAULT_CONFIG };
	}

	try {
		const raw = fs.readFileSync(configPath, 'utf-8');
		const validConfig = JSON.parse(raw);
		validateConfig(validConfig);

		// If migrating from an older version, bump it seamlessly
		if (!validConfig.version || validConfig.version < 2) {
			validConfig.version = 2;
			saveConfig(validConfig);
		}

		return validConfig;
	} catch (_err) {
		console.error(`Warning: ${configPath} is malformed, using defaults`);
		const backupPath = `${configPath}.bak`;
		try {
			fs.copyFileSync(configPath, backupPath);
			console.error(
				`A backup of the corrupted config has been saved to ${backupPath}`,
			);
		} catch {
			// Ignore backup errors
		}
		return { ...DEFAULT_CONFIG };
	}
}

export function saveConfig(config: Config, filePath?: string): void {
	const configPath = filePath ?? getConfigPath();
	const dir = path.dirname(configPath);
	const tempPath = `${configPath}.${Date.now()}.tmp`;

	try {
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(tempPath, JSON.stringify(config, null, 2));
		fs.renameSync(tempPath, configPath);
	} catch (error) {
		console.error(
			`Error saving config to ${configPath}:`,
			error instanceof Error ? error.message : String(error),
		);
		try {
			if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
		} catch {
			// Ignore cleanup errors
		}
	}
}

export function bootstrapStarterConfig(filePath?: string): string {
	const configPath = filePath ?? getConfigPath();

	if (fs.existsSync(configPath)) {
		throw new Error(`A configuration file already exists at ${configPath}`);
	}

	saveConfig(INITIAL_CONFIG, configPath);
	return configPath;
}
