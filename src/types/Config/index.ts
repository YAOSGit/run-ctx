import type { Alias } from '../Alias/index.js';

export type Config = {
	version?: number;
	aliases: Record<string, Alias>;
};
