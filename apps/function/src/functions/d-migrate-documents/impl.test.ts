// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { buildMigrateDocuments } from './impl.ts';

const createPrismaError = (code: string) => Object.assign(new Error(`Prisma error ${code}`), { code });

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
				sourceSystem: 'horizon',
				documentType: 'Application Form'
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
				sourceSystem: 'horizon',
				documentType: 'Application Form'
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

	test('should throw error when document upload fails', async () => {
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

		const uploadError = new Error('Blob storage upload failed');

		service.sourceDatabaseClient.appealDocument.findMany.mock.mockImplementationOnce(() =>
			Promise.resolve(mockDocuments)
		);
		service.sourceDocumentClient.getDocument.mock.mockImplementationOnce(() =>
			Promise.resolve({ stream: {}, filename: 'test.pdf' })
		);
		service.sinkDocumentClient.getBlockBlobClient.mock.mockImplementationOnce(() => ({
			uploadStream: () => Promise.reject(uploadError)
		}));

		const handler = buildMigrateDocuments(service);
		await assert.rejects(() => handler({ documentId: 'doc-123', caseReference: 'APP/123' }, context), uploadError);

		assert.strictEqual(context.error.mock.callCount(), 1);
		assert.strictEqual(
			context.error.mock.calls[0].arguments[0],
			'Failed to copy document version 1: Error: Blob storage upload failed'
		);
	});

	test('retries transaction on transient Prisma error and succeeds', async () => {
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
				sourceSystem: 'horizon',
				documentType: 'Application Form'
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
			uploadStream: (stream) => Promise.resolve()
		}));

		let transactionCallCount = 0;
		service.sinkDatabaseClient.$transaction.mock.mockImplementation((fn) => {
			transactionCallCount++;
			if (transactionCallCount === 1) {
				throw createPrismaError('P1001');
			}
			return fn(service.sinkDatabaseClient);
		});
		service.sinkDatabaseClient.document.create.mock.mockImplementationOnce(() =>
			Promise.resolve({
				guid: 'doc-123',
				versions: [{ version: 1 }]
			})
		);

		const handler = buildMigrateDocuments(service);
		await handler({ documentId: 'doc-123', caseReference: 'APP/123' }, context);

		assert.strictEqual(service.sinkDatabaseClient.$transaction.mock.callCount(), 2);
	});

	test('throws after max retry attempts on transaction', async () => {
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
				sourceSystem: 'horizon',
				documentType: 'Application Form'
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
			uploadStream: (stream) => Promise.resolve()
		}));

		const error = createPrismaError('P1001');
		service.sinkDatabaseClient.$transaction.mock.mockImplementation(() => {
			throw error;
		});

		const handler = buildMigrateDocuments(service);
		await assert.rejects(
			() => handler({ documentId: 'doc-123', caseReference: 'APP/123' }, context),
			(thrown) => {
				assert.strictEqual(thrown, error);
				return true;
			}
		);

		assert.strictEqual(service.sinkDatabaseClient.$transaction.mock.callCount(), 3);
	});
});
