import * as esbuild from 'esbuild';
import { createEsbuildConfig } from '@yaos-git/toolkit/build';

const cliConfig = createEsbuildConfig({ entry: 'src/app/cli.ts' });
const tuiConfig = createEsbuildConfig({ entry: 'src/app/tui.tsx' });

// Build runner (lean, no React)
await esbuild.build({
	...cliConfig,
	outfile: 'dist/cli.js',
	external: ['re2', ...cliConfig.external],
});

// Build TUI (Ink/React alias editor)
await esbuild.build({
	...tuiConfig,
	outfile: 'dist/tui.js',
	external: ['re2', ...tuiConfig.external],
});
