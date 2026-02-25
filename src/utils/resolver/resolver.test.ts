import { describe, expect, it } from 'vitest';
import type { Alias } from '../../types/Alias/index.js';
import { resolveAlias } from './index.js';

const makeAlias = (desc: string): Alias => ({
	description: desc,
	rules: [{ match: { file: 'package.json' }, command: `echo ${desc}` }],
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

	it('ignores arbitrary flags if root matches', () => {
		const aliases = { foo: makeAlias('foo') };
		const result = resolveAlias(aliases, ['foo', '--test', '-x']);
		expect(result).toEqual({
			alias: aliases.foo,
			aliasName: 'foo',
			passthroughArgs: ['--test', '-x'],
		});
	});

	it('stops greedy dot-matching at -- (F4 constraint)', () => {
		const aliases = {
			foo: makeAlias('foo'),
			'foo.bar': makeAlias('foo.bar'),
		};
		const result = resolveAlias(aliases, ['foo', '--', 'bar']);
		expect(result).toEqual({
			alias: aliases.foo,
			aliasName: 'foo',
			passthroughArgs: ['bar'],
		});
	});

	it('ignores -- entirely when parsing passthrough payload', () => {
		const aliases = { foo: makeAlias('foo') };
		const result = resolveAlias(aliases, ['foo', '--', '--test']);
		expect(result).toEqual({
			alias: aliases.foo,
			aliasName: 'foo',
			passthroughArgs: ['--test'],
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
	it('ignores alias names starting with a dash (flag-like)', () => {
		const aliases = { '--help': makeAlias('help') };
		const result = resolveAlias(aliases, ['--help']);
		expect(result).toBeNull();
	});
});
