// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { validateDocuments } from './validate-documents.ts';

const createSinkDocumentClientMock = (existsResult = true) => ({
	getBlockBlobClient: mock.fn(() => ({
		exists: mock.fn(() => Promise.resolve(existsResult))
	}))
});

const createDocument = (overrides = {}) => ({
	documentId: 'doc-123',
	caseReference: 'APP/123',
	filename: 'test.pdf',
	version: 1,
	...overrides
});

describe('validateDocuments', () => {
	test('returns true when all documents exist', async () => {
		const client = createSinkDocumentClientMock(true);
		const documents = [createDocument()];

		const result = await validateDocuments(documents, client);

		assert.strictEqual(result, true);
		assert.strictEqual(client.getBlockBlobClient.mock.callCount(), 1);
	});

	test('returns false when document missing (fail fast)', async () => {
		const client = createSinkDocumentClientMock(false);
		const documents = [createDocument(), createDocument({ documentId: 'doc-456' })];

		const result = await validateDocuments(documents, client);

		assert.strictEqual(result, false);
		assert.strictEqual(client.getBlockBlobClient.mock.callCount(), 1);
	});

	test('returns true for empty document array', async () => {
		const client = createSinkDocumentClientMock();

		const result = await validateDocuments([], client);

		assert.strictEqual(result, true);
		assert.strictEqual(client.getBlockBlobClient.mock.callCount(), 0);
	});

	test('validates multiple versions', async () => {
		const client = createSinkDocumentClientMock(true);
		const documents = [createDocument({ version: 1 }), createDocument({ version: 2, filename: 'v2.pdf' })];

		const result = await validateDocuments(documents, client);

		assert.strictEqual(result, true);
		assert.strictEqual(client.getBlockBlobClient.mock.callCount(), 2);
	});
});
