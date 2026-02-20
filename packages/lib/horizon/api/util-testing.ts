import fs from 'node:fs/promises';
import path from 'node:path';
import type { AssertSnapshotOptions } from 'node:test';

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
