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
	if (args.length === 0 || args[0].startsWith('-')) {
		return null;
	}

	// Find absolute separator boundary
	const separatorIndex = args.indexOf('--');
	const limit = separatorIndex !== -1 ? separatorIndex : args.length;

	// Greedy: try longest dot-joined key first up to the limit, then shrink
	for (let consumed = limit; consumed >= 1; consumed--) {
		const candidate = args.slice(0, consumed).join('.');
		const alias = aliases[candidate];
		if (alias) {
			let passthrough = args.slice(consumed);

			// Strip precisely the "--" separator itself off the start if it exists
			if (passthrough.length > 0 && passthrough[0] === '--') {
				passthrough = passthrough.slice(1);
			}

			return {
				alias,
				aliasName: candidate,
				passthroughArgs: passthrough,
			};
		}
	}
	return null;
}
