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
			findAvailableCaseForDocumentList: mock.fn(async () => null),
			processDocumentListStep: mock.fn(),
			upsertDocumentsToMigrate: mock.fn(),
			markDocumentListStepComplete: mock.fn()
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

		assert.equal(migration.findAvailableCaseForDocumentList.mock.calls.length, 1);
		assert.equal(source.fetchDocumentsByCaseReference.mock.calls.length, 0);
		assert.equal(migrationDb.$transaction.mock.calls.length, 0);

		assert.ok(context.log.mock.calls.some((c) => c.arguments[0] === 'No cases ready for document list building'));
	});

	test('processes case end-to-end when claim succeeds', async () => {
		const availableCase = { caseReference: 'CASE-1', documentListStepId: 123 };
		const documents = [
			{ documentId: 'DOC-1', caseReference: 'CASE-1' },
			{ documentId: 'DOC-2', caseReference: 'CASE-1' }
		];

		const migration = {
			findAvailableCaseForDocumentList: mock.fn(async () => availableCase),
			processDocumentListStep: mock.fn(async () => true),
			upsertDocumentsToMigrate: mock.fn(async () => undefined),
			markDocumentListStepComplete: mock.fn(async () => undefined)
		};

		const source = {
			fetchDocumentsByCaseReference: mock.fn(async () => documents)
		};

		const tx = {}; // transaction client placeholder

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

		// fetches the case and documents
		assert.equal(migration.findAvailableCaseForDocumentList.mock.calls.length, 1);
		assert.deepEqual(source.fetchDocumentsByCaseReference.mock.calls[0].arguments, [{}, 'CASE-1']);

		// runs a single transaction
		assert.equal(migrationDb.$transaction.mock.calls.length, 1);

		// inside transaction: claims, upserts, completes
		assert.deepEqual(migration.processDocumentListStep.mock.calls[0].arguments, [tx, 123]);
		assert.deepEqual(migration.upsertDocumentsToMigrate.mock.calls[0].arguments, [tx, documents]);
		assert.deepEqual(migration.markDocumentListStepComplete.mock.calls[0].arguments, [tx, 123]);

		assert.ok(
			context.log.mock.calls.some((c) => String(c.arguments[0]).includes('Completed document list for case CASE-1'))
		);
	});

	test('does not upsert or complete when claim fails (another instance won)', async () => {
		const availableCase = { caseReference: 'CASE-1', documentListStepId: 123 };

		const migration = {
			findAvailableCaseForDocumentList: mock.fn(async () => availableCase),
			processDocumentListStep: mock.fn(async () => false),
			upsertDocumentsToMigrate: mock.fn(async () => undefined),
			markDocumentListStepComplete: mock.fn(async () => undefined)
		};

		const source = {
			fetchDocumentsByCaseReference: mock.fn(async () => [])
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

		assert.equal(migrationDb.$transaction.mock.calls.length, 1);
		assert.equal(migration.processDocumentListStep.mock.calls.length, 1);

		// critical behavior: no writes after failed claim
		assert.equal(migration.upsertDocumentsToMigrate.mock.calls.length, 0);
		assert.equal(migration.markDocumentListStepComplete.mock.calls.length, 0);

		assert.ok(context.log.mock.calls.some((c) => String(c.arguments[0]).includes('was processed by another instance')));
	});

	test('logs and rethrows when an error occurs', async () => {
		const migration = {
			findAvailableCaseForDocumentList: mock.fn(async () => {
				throw new Error('boom');
			}),
			processDocumentListStep: mock.fn(),
			upsertDocumentsToMigrate: mock.fn(),
			markDocumentListStepComplete: mock.fn()
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
