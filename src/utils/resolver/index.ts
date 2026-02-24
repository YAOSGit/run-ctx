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
