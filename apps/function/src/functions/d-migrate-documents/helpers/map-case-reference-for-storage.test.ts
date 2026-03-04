import assert from 'node:assert';
import { describe, test } from 'node:test';
import { buildBlobStoragePath, mapCaseReferenceForStorageUrl } from './map-case-reference-for-storage.ts';
import { expectedPaths, testCases } from './test-data/mock-case-references.ts';

describe('mapCaseReferenceForStorageUrl', () => {
	test('replaces forward slashes with hyphens', () => {
		const result = mapCaseReferenceForStorageUrl(testCases.standardCaseReference);
		assert.strictEqual(result, testCases.mappedCaseReference);
	});

	test('handles case reference with no slashes', () => {
		const result = mapCaseReferenceForStorageUrl(testCases.mappedCaseReference);
		assert.strictEqual(result, testCases.mappedCaseReference);
	});

	test('handles empty string', () => {
		const result = mapCaseReferenceForStorageUrl(testCases.emptyCaseReference);
		assert.strictEqual(result, testCases.emptyCaseReference);
	});
});

describe('buildBlobStoragePath', () => {
	const build = (version: number, filename?: string) =>
		buildBlobStoragePath(
			testCases.standardCaseReference,
			testCases.documentId,
			version,
			filename ?? testCases.standardFilename
		);

	test('builds correct blob storage path', () => {
		assert.strictEqual(build(1), expectedPaths.version1);
	});

	test('handles different version numbers', () => {
		assert.strictEqual(build(5), expectedPaths.version5);
	});

	test('handles special characters in filename', () => {
		assert.strictEqual(build(1, testCases.filenameWithSpecialChars), expectedPaths.withSpecialChars);
	});
});
