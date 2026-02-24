import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Config } from '../../types/Config/index.js';

const DEFAULT_CONFIG: Config = { aliases: {} };

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
