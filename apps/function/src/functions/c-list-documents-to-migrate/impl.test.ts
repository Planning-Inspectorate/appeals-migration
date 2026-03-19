// @ts-nocheck
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';
import { buildListDocumentsToMigrate } from './impl.ts';

const createPrismaError = (code: string) => Object.assign(new Error(`Prisma error ${code}`), { code });

describe('impl - buildListDocumentsToMigrate', () => {
	const makeContext = () => ({
		log: mock.fn(),
		error: mock.fn()
	});

	test('processes case end-to-end', async () => {
		const caseToMigrate = { caseReference: 'CASE-1', documentListStepId: 123 };
		const documents = [
			{ documentId: 'DOC-1', caseReference: 'CASE-1' },
			{ documentId: 'DOC-2', caseReference: 'CASE-1' }
		];

		const migration = {
			upsertDocumentsToMigrate: mock.fn(async () => undefined)
		};

		const source = {
			fetchDocumentsByCaseReference: mock.fn(async () => documents)
		};

		const tx = {};

		const migrationDb = {
			$transaction: mock.fn(async (cb) => cb(tx))
		};

		const service = {
			databaseClient: migrationDb,
			sourceDatabaseClient: {}
		};

		const handler = buildListDocumentsToMigrate(service as any, migration as any, source as any);
		const context = makeContext();

		await handler(caseToMigrate as any, context as any);

		assert.deepEqual(source.fetchDocumentsByCaseReference.mock.calls[0].arguments, [{}, 'CASE-1']);
		assert.equal(migrationDb.$transaction.mock.calls.length, 1);
		assert.deepEqual(migration.upsertDocumentsToMigrate.mock.calls[0].arguments, [tx, documents]);

		assert.ok(
			context.log.mock.calls.some((c) => String(c.arguments[0]).includes('Completed document list for case CASE-1'))
		);
	});

	test('propagates errors from source fetch', async () => {
		const migration = {
			upsertDocumentsToMigrate: mock.fn()
		};

		const source = {
			fetchDocumentsByCaseReference: mock.fn(async () => {
				throw new Error('boom');
			})
		};

		const service = {
			databaseClient: { $transaction: mock.fn() },
			sourceDatabaseClient: {}
		};

		const caseToMigrate = { caseReference: 'CASE-ERR' };
		const handler = buildListDocumentsToMigrate(service as any, migration as any, source as any);
		const context = makeContext();

		await assert.rejects(() => handler(caseToMigrate as any, context as any), /boom/);
	});

	test('retries transaction on transient Prisma error and succeeds', async () => {
		const caseToMigrate = { caseReference: 'CASE-1', documentListStepId: 123 };
		const documents = [{ documentId: 'DOC-1', caseReference: 'CASE-1' }];

		const migration = {
			upsertDocumentsToMigrate: mock.fn(async () => undefined)
		};

		const source = {
			fetchDocumentsByCaseReference: mock.fn(async () => documents)
		};

		const tx = {};
		let transactionCallCount = 0;
		const migrationDb = {
			$transaction: mock.fn(async (cb) => {
				transactionCallCount++;
				if (transactionCallCount === 1) {
					throw createPrismaError('P1001');
				}
				return cb(tx);
			})
		};

		const service = {
			databaseClient: migrationDb,
			sourceDatabaseClient: {}
		};

		const handler = buildListDocumentsToMigrate(service as any, migration as any, source as any);
		const context = makeContext();

		await handler(caseToMigrate as any, context as any);

		assert.equal(migrationDb.$transaction.mock.calls.length, 2);
	});

	test('throws after max retry attempts on transaction', async () => {
		const caseToMigrate = { caseReference: 'CASE-1', documentListStepId: 123 };
		const documents = [{ documentId: 'DOC-1', caseReference: 'CASE-1' }];

		const migration = {
			upsertDocumentsToMigrate: mock.fn()
		};

		const source = {
			fetchDocumentsByCaseReference: mock.fn(async () => documents)
		};

		const error = createPrismaError('P1001');
		const migrationDb = {
			$transaction: mock.fn(async () => {
				throw error;
			})
		};

		const service = {
			databaseClient: migrationDb,
			sourceDatabaseClient: {}
		};

		const handler = buildListDocumentsToMigrate(service as any, migration as any, source as any);
		const context = makeContext();

		await assert.rejects(
			() => handler(caseToMigrate as any, context as any),
			(thrown) => {
				assert.strictEqual(thrown, error);
				return true;
			}
		);

		assert.equal(migrationDb.$transaction.mock.calls.length, 3);
	});
});
