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
	external: ['re2', ...builtinModules.map((m) => `node:${m}`)],
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
