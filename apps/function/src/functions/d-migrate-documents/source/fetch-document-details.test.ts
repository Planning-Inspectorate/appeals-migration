// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { fetchDocumentDetails } from './fetch-document-details.ts';

describe('fetchDocumentDetails', () => {
	test('should fetch all versions of a document ordered by version', async () => {
		const mockDocuments = [
			{ documentId: 'doc-123', version: 1, filename: 'doc-v1.pdf', caseReference: 'APP/123' },
			{ documentId: 'doc-123', version: 2, filename: 'doc-v2.pdf', caseReference: 'APP/123' },
			{ documentId: 'doc-123', version: 3, filename: 'doc-v3.pdf', caseReference: 'APP/123' }
		];

		const mockSourceDb = {
			appealDocument: {
				findMany: mock.fn(() => Promise.resolve(mockDocuments))
			}
		};

		const result = await fetchDocumentDetails(mockSourceDb, 'doc-123');

		assert.strictEqual(result.length, 3);
		assert.strictEqual(result[0].version, 1);
		assert.strictEqual(result[2].version, 3);
		assert.strictEqual(mockSourceDb.appealDocument.findMany.mock.callCount(), 1);

		const callArgs = mockSourceDb.appealDocument.findMany.mock.calls[0].arguments[0];
		assert.deepStrictEqual(callArgs.where, { documentId: 'doc-123' });
		assert.deepStrictEqual(callArgs.orderBy, { version: 'asc' });
	});

	test('should throw error when no documents found', async () => {
		const mockSourceDb = {
			appealDocument: {
				findMany: mock.fn(() => Promise.resolve([]))
			}
		};

		await assert.rejects(() => fetchDocumentDetails(mockSourceDb, 'non-existent-doc'), {
			name: 'Error',
			message: 'No document found with documentId: non-existent-doc'
		});
	});

	test('should handle single version document', async () => {
		const mockDocuments = [{ documentId: 'doc-456', version: 1, filename: 'single.pdf', caseReference: 'APP/456' }];

		const mockSourceDb = {
			appealDocument: {
				findMany: mock.fn(() => Promise.resolve(mockDocuments))
			}
		};

		const result = await fetchDocumentDetails(mockSourceDb, 'doc-456');

		assert.strictEqual(result.length, 1);
		assert.strictEqual(result[0].documentId, 'doc-456');
	});
});
