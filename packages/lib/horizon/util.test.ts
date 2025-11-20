import { cleanHorizonResponse, prefixAllKeys } from './util.ts';
import assert from 'node:assert';
import { describe, it } from 'node:test';
import fs from 'fs/promises';
import path from 'path';
import type { AssertSnapshotOptions } from 'node:test';

describe('util', () => {
	describe('prefixAllKeys', () => {
		it('should prefix all keys in a flat object', () => {
			const input = { a: 1, b: 2 };
			const result = prefixAllKeys(input, 'x_');
			assert.deepStrictEqual(result, { x_a: 1, x_b: 2 });
		});

		it('should handle empty objects', () => {
			const input = {};
			const result = prefixAllKeys(input, 'pre_');
			assert.deepStrictEqual(result, {});
		});

		it('should work with non-string values', () => {
			const input = { a: null, b: undefined, c: false, d: 0 };
			const result = prefixAllKeys(input, 'p_');
			assert.deepStrictEqual(result, { p_a: null, p_b: undefined, p_c: false, p_d: 0 });
		});

		it('should handle numeric keys (converted to string)', () => {
			const input = { 1: 'one', 2: 'two' };
			const result = prefixAllKeys(input, 'num_');
			assert.deepStrictEqual(result, { num_1: 'one', num_2: 'two' });
		});

		it('should not mutate the original object', () => {
			const input = Object.freeze({ a: 1 });
			const result = prefixAllKeys(input, 'z_');
			assert.deepStrictEqual(input, { a: 1 }); // Still unchanged
			assert.notStrictEqual(result, input); // Should not be the same reference
		});
	});
	describe('cleanHorizonResponse', () => {
		it('should clean value objects', async (ctx) => {
			const got = cleanHorizonResponse(await readTestFile('./testing/horizon-response-example-1.json'));
			ctx.assert.fileSnapshot(got, snapshotPath('clean-horizon-response-1.json'), snapshotOptions);
		});
		it('should clean Attributes and handle nested Values', async (ctx) => {
			const got = cleanHorizonResponse(await readTestFile('./testing/horizon-response-example-2.json'));
			ctx.assert.fileSnapshot(got, snapshotPath('clean-horizon-response-2.json'), snapshotOptions);
		});
		it('should handle duplicate Case Involvement metadata entries', async (ctx) => {
			const got = cleanHorizonResponse(await readTestFile('./testing/horizon-response-example-3.json'));
			ctx.assert.fileSnapshot(got, snapshotPath('clean-horizon-response-3.json'), snapshotOptions);
		});
		it('should clean a full GetCase response', async (ctx) => {
			const got = cleanHorizonResponse(await readTestFile('./testing/horizon-response-example-4.json'));
			ctx.assert.fileSnapshot(got, snapshotPath('clean-horizon-response-4.json'), snapshotOptions);
		});
	});
});

export function testDir() {
	return path.dirname(new URL(import.meta.url).pathname);
}

export function snapshotPath(file: string) {
	return path.join(testDir(), 'testing', 'snapshots', file);
}

export async function readTestFile(filepath: string): Promise<string> {
	const file = await fs.readFile(path.join(testDir(), filepath));
	return file.toString('utf-8');
}

export const snapshotOptions: AssertSnapshotOptions = {
	serializers: [(v) => v] // don't transform values for snapshots
};
