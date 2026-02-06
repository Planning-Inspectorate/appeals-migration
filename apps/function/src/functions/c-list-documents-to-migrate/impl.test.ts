// @ts-nocheck
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { buildListDocumentsToMigrate } from './impl.ts';

describe('impl - buildListDocumentsToMigrate', () => {
	const makeContext = () => ({
		log: mock.fn(),
		error: mock.fn()
	});

	test('logs and returns when no cases are available', async () => {
		const migration = {
			claimNextCaseForDocumentList: mock.fn(async () => null),
			updateDocumentListStepComplete: mock.fn(),
			upsertDocumentsToMigrate: mock.fn()
		};

		const source = {
			fetchDocumentsByCaseReference: mock.fn()
		};

		const migrationDb = { $transaction: mock.fn() };
		const service = {
			databaseClient: migrationDb,
			sourceDatabaseClient: {}
		};

		const handler = buildListDocumentsToMigrate(service as any, migration as any, source as any);
		const context = makeContext();

		await handler({} as any, context as any);

		assert.equal(migration.claimNextCaseForDocumentList.mock.calls.length, 1);
		assert.equal(source.fetchDocumentsByCaseReference.mock.calls.length, 0);
		assert.equal(migrationDb.$transaction.mock.calls.length, 0);

		assert.ok(context.log.mock.calls.some((c) => c.arguments[0] === 'No cases ready for document list building'));
	});

	test('processes case end-to-end when claim succeeds', async () => {
		const claimedCase = { caseReference: 'CASE-1', documentListStepId: 123 };
		const documents = [
			{ documentId: 'DOC-1', caseReference: 'CASE-1' },
			{ documentId: 'DOC-2', caseReference: 'CASE-1' }
		];

		const migration = {
			claimNextCaseForDocumentList: mock.fn(async () => claimedCase),
			updateDocumentListStepComplete: mock.fn(async () => undefined),
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

		await handler({} as any, context as any);

		assert.equal(migration.claimNextCaseForDocumentList.mock.calls.length, 1);
		assert.deepEqual(source.fetchDocumentsByCaseReference.mock.calls[0].arguments, [{}, 'CASE-1']);
		assert.equal(migrationDb.$transaction.mock.calls.length, 1);
		assert.deepEqual(migration.upsertDocumentsToMigrate.mock.calls[0].arguments, [tx, documents]);
		assert.deepEqual(migration.updateDocumentListStepComplete.mock.calls[0].arguments, [migrationDb, 'CASE-1', true]);

		assert.ok(
			context.log.mock.calls.some((c) => String(c.arguments[0]).includes('Completed document list for case CASE-1'))
		);
	});

	test('logs and rethrows when an error occurs', async () => {
		const migration = {
			claimNextCaseForDocumentList: mock.fn(async () => {
				throw new Error('boom');
			}),
			updateDocumentListStepComplete: mock.fn(),
			upsertDocumentsToMigrate: mock.fn()
		};

		const source = {
			fetchDocumentsByCaseReference: mock.fn()
		};

		const service = {
			databaseClient: { $transaction: mock.fn() },
			sourceDatabaseClient: {}
		};

		const handler = buildListDocumentsToMigrate(service as any, migration as any, source as any);
		const context = makeContext();

		await assert.rejects(() => handler({} as any, context as any), /boom/);

		assert.equal(context.error.mock.calls.length, 1);
		assert.equal(context.error.mock.calls[0].arguments[0], 'Error during document list builder run');
	});
});
