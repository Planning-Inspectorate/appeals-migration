// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { createSinkDoc, createSinkVersion, createSourceDoc } from './mock-data/validate-document-metadata.ts';
import { validateDocumentMetadata } from './validate-document-metadata.ts';

describe('validateDocumentMetadata', () => {
	test('returns true for matching documents', () => {
		assert.strictEqual(validateDocumentMetadata([], []).isValid, true);
		assert.strictEqual(validateDocumentMetadata([createSourceDoc()], [createSinkDoc()]).isValid, true);
	});

	test('returns true when multiple versions match', () => {
		const sinkDoc = createSinkDoc({
			versions: [createSinkVersion({ version: 1 }), createSinkVersion({ version: 2, fileName: 'test-v2.pdf' })]
		});
		const result = validateDocumentMetadata(
			[createSourceDoc({ version: 1 }), createSourceDoc({ version: 2, filename: 'test-v2.pdf' })],
			[sinkDoc]
		);
		assert.strictEqual(result.isValid, true);
	});

	test('returns false for document count mismatch', () => {
		assert.strictEqual(validateDocumentMetadata([createSourceDoc()], []).isValid, false);
		assert.strictEqual(validateDocumentMetadata([], [createSinkDoc()]).isValid, false);
		assert.strictEqual(
			validateDocumentMetadata([createSourceDoc({ documentId: null })], [createSinkDoc()]).isValid,
			false
		);
	});

	test('returns false for version mismatch', () => {
		const cases = [
			[createSinkDoc({ guid: 'different-guid' })],
			[createSinkDoc({ versions: [createSinkVersion(), createSinkVersion({ version: 2 })] })],
			[createSinkDoc({ versions: [createSinkVersion({ version: 99 })] })]
		];
		for (const sinkDocs of cases) {
			assert.strictEqual(validateDocumentMetadata([createSourceDoc()], sinkDocs).isValid, false);
		}
	});

	test('returns false for field mismatch', () => {
		const cases = [
			{ fileName: 'different.pdf' },
			{ mime: 'image/png' },
			{ size: 9999 },
			{ fileMD5: 'different-hash' },
			{ horizonDataID: 'different-id' },
			{ datePublished: new Date('2025-01-01T00:00:00.000Z') }
		];
		for (const override of cases) {
			const sinkDoc = createSinkDoc({ versions: [createSinkVersion(override)] });
			assert.strictEqual(validateDocumentMetadata([createSourceDoc()], [sinkDoc]).isValid, false);
		}
	});

	test('populates errors with field name, source and sink values on mismatch', () => {
		const sinkDoc = createSinkDoc({ versions: [createSinkVersion({ fileName: 'different.pdf' })] });
		const result = validateDocumentMetadata([createSourceDoc()], [sinkDoc]);
		assert.strictEqual(result.isValid, false);
		assert.strictEqual(result.errors.length > 0, true);
		assert.strictEqual(result.errors[0].sourceModel, 'Document');
		assert.strictEqual(result.errors[0].sourceField, 'Filename');
		assert.match(result.errors[0].error, /Expected 'test\.pdf' got 'different\.pdf'/);
	});

	test('handles null values correctly', () => {
		const sourceDoc = createSourceDoc({ mime: null, size: null, fileMD5: null, description: null, author: null });
		const sinkDoc = createSinkDoc({
			versions: [createSinkVersion({ mime: null, size: null, fileMD5: null, description: null, author: null })]
		});
		assert.strictEqual(validateDocumentMetadata([sourceDoc], [sinkDoc]).isValid, true);
	});

	test('validates multiple documents correctly', () => {
		const sinkDoc1 = createSinkDoc({ guid: 'doc-1', versions: [createSinkVersion({ horizonDataID: 'doc-1' })] });
		const sinkDoc2 = createSinkDoc({
			guid: 'doc-2',
			versions: [createSinkVersion({ fileName: 'other.pdf', horizonDataID: 'doc-2' })]
		});
		assert.strictEqual(
			validateDocumentMetadata(
				[createSourceDoc({ documentId: 'doc-1' }), createSourceDoc({ documentId: 'doc-2', filename: 'other.pdf' })],
				[sinkDoc1, sinkDoc2]
			).isValid,
			true
		);
		assert.strictEqual(
			validateDocumentMetadata([createSourceDoc({ documentId: 'doc-1' })], [createSinkDoc({ guid: 'doc-unknown' })])
				.isValid,
			false
		);
	});
});
