// @ts-nocheck
import { app } from '@azure/functions';
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { stepStatus } from '../../types.ts';
import { createWorker } from './worker.ts';

describe('createWorker', () => {
	const newContext = () => ({
		log: mock.fn(),
		error: mock.fn(),
		invocationId: 'test-invocation-id'
	});

	const newService = () => {
		const databaseClient = {
			documentToMigrate: {
				count: mock.fn(async () => 1)
			},
			caseToMigrate: {
				findUnique: mock.fn(async () => null)
			},
			migrationStep: {
				update: mock.fn(),
				updateMany: mock.fn()
			},
			$queryRaw: mock.fn(async () => []),
			$transaction: mock.fn(async (callback) => callback(databaseClient))
		};

		return { databaseClient };
	};

	const captureHandler = (service, name, queue, migration, field) => {
		let captured;
		mock.method(app, 'serviceBusQueue', (_name, options) => {
			captured = options.handler;
		});
		createWorker(service, name, queue, migration, field);
		app.serviceBusQueue.mock.restore();
		return captured;
	};

	test('registers a service bus queue handler with correct config', () => {
		let registered;
		mock.method(app, 'serviceBusQueue', (name, options) => {
			registered = { name, connection: options.connection, queueName: options.queueName };
		});

		createWorker(newService(), 'test-worker', 'test-queue', mock.fn(), 'dataStepId');
		app.serviceBusQueue.mock.restore();

		assert.deepStrictEqual(registered, {
			name: 'test-worker',
			connection: 'SERVICE_BUS_CONNECTION_STRING',
			queueName: 'test-queue'
		});
	});

	test('calls migration function with case and context', async () => {
		const service = newService();
		const migration = mock.fn(async () => {});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-001', dataStepId: 10 };

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');
		await handler(caseToMigrate, context);

		assert.strictEqual(migration.mock.callCount(), 1);
		assert.deepStrictEqual(migration.mock.calls[0].arguments, [caseToMigrate, context]);
	});

	test('sets processing status before migration and complete after', async () => {
		const service = newService();
		const migration = mock.fn(async () => {});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-001', dataStepId: 10 };

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');
		await handler(caseToMigrate, context);

		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 2);

		const processingCall = service.databaseClient.migrationStep.update.mock.calls[0].arguments[0];
		assert.deepStrictEqual(processingCall.where, { id: 10 });
		assert.strictEqual(processingCall.data.status, stepStatus.processing);
		assert.ok(processingCall.data.startedAt instanceof Date);
		assert.strictEqual(processingCall.data.invocationId, 'test-invocation-id');

		const completeCall = service.databaseClient.migrationStep.update.mock.calls[1].arguments[0];
		assert.deepStrictEqual(completeCall.where, { id: 10 });
		assert.strictEqual(completeCall.data.status, stepStatus.complete);
		assert.ok(completeCall.data.completedAt instanceof Date);
	});

	test('marks step as failed with error message on migration failure', async () => {
		const service = newService();
		const error = new Error('migration failed');
		const migration = mock.fn(async function testMigration() {
			throw error;
		});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-ERR', dataStepId: 20 };

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');
		await handler(caseToMigrate, context);

		assert.strictEqual(context.error.mock.callCount(), 1);
		assert.strictEqual(context.error.mock.calls[0].arguments[0], 'Failed in test-worker for case CASE-ERR:');
		assert.strictEqual(context.error.mock.calls[0].arguments[1], error);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 2);

		const failedCall = service.databaseClient.migrationStep.update.mock.calls[1].arguments[0];
		assert.deepStrictEqual(failedCall.where, { id: 20 });
		assert.strictEqual(failedCall.data.status, stepStatus.failed);
		assert.ok(failedCall.data.completedAt instanceof Date);
		assert.strictEqual(failedCall.data.errorMessage, 'migration failed');
	});

	test('uses the correct step id field', async () => {
		const service = newService();
		const migration = mock.fn(async () => {});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-001', documentListStepId: 42 };

		const handler = captureHandler(service, 'doc-worker', 'doc-queue', migration, 'documentListStepId');
		await handler(caseToMigrate, context);

		const processingCall = service.databaseClient.migrationStep.update.mock.calls[0].arguments[0];
		assert.deepStrictEqual(processingCall.where, { id: 42 });

		const completeCall = service.databaseClient.migrationStep.update.mock.calls[1].arguments[0];
		assert.deepStrictEqual(completeCall.where, { id: 42 });
		assert.strictEqual(completeCall.data.status, stepStatus.complete);
	});

	test('propagates database update error', async () => {
		const service = newService();
		const migration = mock.fn(async () => {});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-001', dataStepId: 10 };
		const error = new Error('database unavailable');

		service.databaseClient.migrationStep.update.mock.mockImplementation(() => {
			throw error;
		});

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');

		await assert.rejects(() => handler(caseToMigrate, context), error);
	});

	test('marks step failed after migration error', async () => {
		const service = newService();
		const migration = mock.fn(async () => {
			throw new Error('transient failure');
		});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-002', documentsStepId: 55 };

		const handler = captureHandler(service, 'docs-worker', 'docs-queue', migration, 'documentsStepId');
		await handler(caseToMigrate, context);

		const failedCall = service.databaseClient.migrationStep.update.mock.calls[1].arguments[0];
		assert.deepStrictEqual(failedCall.where, { id: 55 });
		assert.strictEqual(failedCall.data.status, stepStatus.failed);
		assert.strictEqual(failedCall.data.errorMessage, 'transient failure');
	});

	test('stores string representation when non-Error is thrown', async () => {
		const service = newService();
		const migration = mock.fn(async () => {
			throw 'plain string error';
		});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-003', dataStepId: 30 };

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');
		await handler(caseToMigrate, context);

		const failedCall = service.databaseClient.migrationStep.update.mock.calls[1].arguments[0];
		assert.strictEqual(failedCall.data.status, stepStatus.failed);
		assert.strictEqual(failedCall.data.errorMessage, 'plain string error');
	});

	test('completes case documents step when final document migration completes', async () => {
		const service = newService();
		service.databaseClient.documentToMigrate.count.mock.mockImplementation(async () => 0);
		service.databaseClient.caseToMigrate.findUnique.mock.mockImplementation(async () => ({ documentsStepId: 88 }));
		service.databaseClient.$queryRaw.mock.mockImplementation(async () => [{ documentsStepId: 88 }]);
		const migration = mock.fn(async () => {});
		const context = newContext();
		const migrationItem = { caseReference: 'CASE-010', migrationStepId: 50 };

		const handler = captureHandler(service, 'docs-worker', 'docs-queue', migration, 'migrationStepId');
		await handler(migrationItem, context);

		assert.strictEqual(service.databaseClient.documentToMigrate.count.mock.callCount(), 2);
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.caseToMigrate.findUnique.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 3);

		const caseStepUpdateCall = service.databaseClient.migrationStep.update.mock.calls[2].arguments[0];
		assert.deepStrictEqual(caseStepUpdateCall.where, { id: 88 });
		assert.strictEqual(caseStepUpdateCall.data.status, stepStatus.complete);
	});

	test('does not complete case documents step when documents remain incomplete', async () => {
		const service = newService();
		service.databaseClient.documentToMigrate.count.mock.mockImplementation(async () => 2);
		service.databaseClient.$queryRaw.mock.mockImplementation(async () => [{ documentsStepId: 88 }]);
		const migration = mock.fn(async () => {});
		const context = newContext();
		const migrationItem = { caseReference: 'CASE-011', migrationStepId: 51 };

		const handler = captureHandler(service, 'docs-worker', 'docs-queue', migration, 'migrationStepId');
		await handler(migrationItem, context);

		assert.strictEqual(service.databaseClient.documentToMigrate.count.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.caseToMigrate.findUnique.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 2);
	});

	test('marks case documents step failed when all documents finish and at least one failed', async () => {
		const service = newService();
		service.databaseClient.documentToMigrate.count.mock.mockImplementation(async (query) => {
			return query.where?.MigrationStep?.status?.notIn ? 0 : 1;
		});
		service.databaseClient.$queryRaw.mock.mockImplementation(async () => [{ documentsStepId: 88 }]);
		const migration = mock.fn(async () => {
			throw new Error('document failed');
		});
		const context = newContext();
		const migrationItem = { caseReference: 'CASE-013', migrationStepId: 53 };

		const handler = captureHandler(service, 'docs-worker', 'docs-queue', migration, 'migrationStepId');
		await handler(migrationItem, context);

		assert.strictEqual(service.databaseClient.documentToMigrate.count.mock.callCount(), 2);
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 3);

		const caseStepUpdateCall = service.databaseClient.migrationStep.update.mock.calls[2].arguments[0];
		assert.deepStrictEqual(caseStepUpdateCall.where, { id: 88 });
		assert.strictEqual(caseStepUpdateCall.data.status, stepStatus.failed);
	});

	test('does not complete case documents step when case lookup returns null', async () => {
		const service = newService();
		service.databaseClient.caseToMigrate.findUnique.mock.mockImplementation(async () => null);
		service.databaseClient.$queryRaw.mock.mockImplementation(async () => []);
		const migration = mock.fn(async () => {});
		const context = newContext();
		const migrationItem = { caseReference: 'CASE-012', migrationStepId: 52 };

		const handler = captureHandler(service, 'docs-worker', 'docs-queue', migration, 'migrationStepId');
		await handler(migrationItem, context);

		assert.strictEqual(service.databaseClient.documentToMigrate.count.mock.callCount(), 0);
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.caseToMigrate.findUnique.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 2);
	});
});
