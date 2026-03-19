import assert from 'node:assert';
import { describe, test } from 'node:test';
import { buildMigrateDocuments } from '../d-migrate-documents/impl.ts';
import { buildMigrateData } from './impl.ts';
import { createMockContext, createMockService, createMockSource } from './mock-data/service.ts';
import { createCaseToMigrate, createDocumentToMigrate } from './mock-data/test-data.ts';

const ctx = createMockContext();

const expectError = async (fn: () => Promise<unknown>, assertions: (error: Error) => void) => {
	await assert.rejects(fn, (error: Error) => {
		assertions(error);
		return true;
	});
};

const expectMessageToInclude = (error: Error, ...parts: string[]) => {
	for (const part of parts) {
		assert.ok(error.message.includes(part), `Missing: ${part}`);
	}
};

describe('Data Migration Error Handling', () => {
	describe('migrateData', () => {
		test('throws when case not found in source database', async () => {
			const migrateData = buildMigrateData(
				createMockService() as any,
				createMockSource({ fetchCaseDetails: async () => null })
			);

			await expectError(
				() => migrateData(createCaseToMigrate(), ctx),
				(error) => {
					expectMessageToInclude(error, 'TEST/123', 'not found in source database');
				}
			);
		});

		test('tracks exact error message', async () => {
			const caseReference = 'TEST/123';

			const migrateData = buildMigrateData(
				createMockService() as any,
				createMockSource({ fetchCaseDetails: async () => null })
			);

			await expectError(
				() => migrateData(createCaseToMigrate({ caseReference }), ctx),
				(error) => {
					assert.strictEqual(error.message, `Case ${caseReference} not found in source database`);
				}
			);
		});
	});

	describe('migrateDocuments', () => {
		test('throws when case not found in sink database', async () => {
			const migrateDocuments = buildMigrateDocuments(
				createMockService({
					sinkDatabaseClient: {
						appeal: { findUnique: async () => null }
					}
				}) as any
			);

			await expectError(
				() => migrateDocuments(createDocumentToMigrate({ caseReference: 'TEST/456' }), ctx),
				(error) => {
					expectMessageToInclude(error, 'TEST/456', 'not found in sink database', 'Migrate the case first');
				}
			);
		});

		test('throws when document has no document type', async () => {
			const migrateDocuments = buildMigrateDocuments(createMockService() as any);

			await expectError(
				() => migrateDocuments(createDocumentToMigrate({ caseReference: 'TEST/789' }), ctx),
				(error) => {
					expectMessageToInclude(error, 'DOC123', 'TEST/789', 'no document type', 'cannot determine folder mapping');
				}
			);
		});

		test('propagates blob upload errors', async () => {
			const uploadError = new Error('Blob storage connection failed');

			const migrateDocuments = buildMigrateDocuments(
				createMockService({
					sinkDocumentClient: {
						getBlockBlobClient: () => ({
							uploadStream: async () => {
								throw uploadError;
							}
						})
					}
				}) as any
			);

			await assert.rejects(
				() =>
					migrateDocuments(
						createDocumentToMigrate({
							documentId: 'DOC456',
							caseReference: 'TEST/999'
						}),
						ctx
					),
				(error: Error) => error === uploadError
			);
		});
	});
});
