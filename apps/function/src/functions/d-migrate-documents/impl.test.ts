// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { buildMigrateDocuments } from './impl.ts';

describe('d-migrate-documents-impl', () => {
	const newService = () => {
		return {
			sourceDatabaseClient: {
				appealDocument: {
					findMany: mock.fn()
				}
			},
			sinkDatabaseClient: {
				appeal: {
					findUnique: mock.fn()
				},
				document: {
					create: mock.fn()
				},
				folder: {
					findFirst: mock.fn(() => Promise.resolve({ id: 1 }))
				},
				$transaction: mock.fn()
			},
			sourceDocumentClient: {
				getDocument: mock.fn()
			},
			sinkDocumentClient: {
				getBlockBlobClient: mock.fn()
			}
		};
	};

	test('should migrate document successfully', async () => {
		const service = newService();
		const context = {
			log: mock.fn(),
			error: mock.fn()
		};

		const mockDocuments = [
			{
				documentId: 'doc-123',
				filename: 'test.pdf',
				version: 1,
				caseReference: 'APP/123',
				sourceSystem: 'horizon'
			}
		];

		service.sourceDatabaseClient.appealDocument.findMany.mock.mockImplementationOnce(() =>
			Promise.resolve(mockDocuments)
		);
		service.sinkDatabaseClient.appeal.findUnique.mock.mockImplementationOnce(() => Promise.resolve({ id: 1 }));
		service.sourceDocumentClient.getDocument.mock.mockImplementationOnce(() =>
			Promise.resolve({ stream: {}, filename: 'test.pdf' })
		);
		service.sinkDocumentClient.getBlockBlobClient.mock.mockImplementationOnce(() => ({
			uploadStream: (stream: any) => Promise.resolve()
		}));
		service.sinkDatabaseClient.$transaction.mock.mockImplementationOnce((fn) => fn(service.sinkDatabaseClient));
		service.sinkDatabaseClient.document.create.mock.mockImplementationOnce(() =>
			Promise.resolve({
				guid: 'doc-123',
				versions: [{ version: 1 }]
			})
		);

		const handler = buildMigrateDocuments(service);
		await handler({ documentId: 'doc-123', caseReference: 'APP/123' }, context);

		assert.strictEqual(service.sourceDatabaseClient.appealDocument.findMany.mock.callCount(), 1);
		assert.strictEqual(service.sinkDatabaseClient.$transaction.mock.callCount(), 1);
		assert.strictEqual(service.sinkDocumentClient.getBlockBlobClient.mock.callCount(), 1);
	});

	test('should throw error when case not found', async () => {
		const service = newService();
		const context = {
			log: mock.fn(),
			error: mock.fn()
		};

		const mockDocuments = [
			{
				documentId: 'doc-123',
				filename: 'test.pdf',
				version: 1,
				caseReference: 'APP/123',
				sourceSystem: 'horizon'
			}
		];

		service.sourceDatabaseClient.appealDocument.findMany.mock.mockImplementationOnce(() =>
			Promise.resolve(mockDocuments)
		);
		service.sinkDatabaseClient.appeal.findUnique.mock.mockImplementationOnce(() => Promise.resolve(null));
		service.sourceDocumentClient.getDocument.mock.mockImplementationOnce(() =>
			Promise.resolve({ stream: {}, filename: 'test.pdf' })
		);
		service.sinkDocumentClient.getBlockBlobClient.mock.mockImplementationOnce(() => ({
			uploadStream: (stream: any) => Promise.resolve()
		}));

		const handler = buildMigrateDocuments(service);
		await assert.rejects(() => handler({ documentId: 'doc-123', caseReference: 'APP/123' }, context), {
			message: 'Case APP/123 not found in sink database. Migrate the case first.'
		});
	});
});
