// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { validateDocuments } from './validate-documents.ts';

const createClientMock = (options = {}) => {
	const { exists = true, contentLength = 1024, contentType = 'application/pdf', contentMD5 = null } = options;
	return {
		getBlockBlobClient: mock.fn(() => ({
			exists: mock.fn(() => Promise.resolve(exists)),
			getProperties: mock.fn(() => Promise.resolve({ contentLength, contentType, contentMD5 }))
		}))
	};
};

const createDoc = (overrides = {}) => ({
	documentId: 'doc-123',
	caseReference: 'APP/123',
	filename: 'test.pdf',
	version: 1,
	size: null,
	mime: null,
	fileMD5: null,
	...overrides
});

describe('validateDocuments', () => {
	test('returns true when document exists with matching metadata', async () => {
		const client = createClientMock({
			contentLength: 1024,
			contentType: 'application/pdf',
			contentMD5: Buffer.from('abc123', 'hex')
		});
		const result = await validateDocuments(
			[createDoc({ size: 1024, mime: 'application/pdf', fileMD5: 'abc123' })],
			client
		);
		assert.strictEqual(result.isValid, true);
	});

	test('returns true for empty array', async () => {
		const client = createClientMock();
		assert.strictEqual((await validateDocuments([], client)).isValid, true);
	});

	test('returns false when document missing', async () => {
		const client = createClientMock({ exists: false });
		const result = await validateDocuments([createDoc(), createDoc({ documentId: 'doc-456' })], client);
		assert.strictEqual(result.isValid, false);
		assert.strictEqual(result.errors.length, 2);
	});

	test('returns false when size mismatch', async () => {
		const client = createClientMock({ contentLength: 2048 });
		assert.strictEqual((await validateDocuments([createDoc({ size: 1024 })], client)).isValid, false);
	});

	test('returns false when MIME mismatch', async () => {
		const client = createClientMock({ contentType: 'image/png' });
		assert.strictEqual((await validateDocuments([createDoc({ mime: 'application/pdf' })], client)).isValid, false);
	});

	test('returns false when MD5 mismatch', async () => {
		const client = createClientMock({ contentMD5: Buffer.from('abc123', 'hex') });
		assert.strictEqual((await validateDocuments([createDoc({ fileMD5: 'def456' })], client)).isValid, false);
	});

	test('skips metadata validation when source values null', async () => {
		const client = createClientMock({ contentLength: 9999, contentType: 'text/plain' });
		assert.strictEqual((await validateDocuments([createDoc()], client)).isValid, true);
	});

	test('returns false when caseReference missing', async () => {
		const client = createClientMock();
		assert.strictEqual((await validateDocuments([createDoc({ caseReference: null })], client)).isValid, false);
	});

	test('returns false when filename missing', async () => {
		const client = createClientMock();
		assert.strictEqual((await validateDocuments([createDoc({ filename: null })], client)).isValid, false);
	});
});
