// @ts-nocheck
import { app } from '@azure/functions';
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { stepStatus } from '../../types.ts';
import { createWorker, handleMigration, handleMigrationWithServiceLifecycle } from './worker.ts';

// Shared test helpers
const createPrismaError = (code) => Object.assign(new Error(`Prisma error ${code}`), { code });

const newContext = () => ({
	log: mock.fn(),
	error: mock.fn(),
	invocationId: 'test-invocation-id'
});

const newService = () => {
	const databaseClient = {
		documentToMigrate: { count: mock.fn(async () => 1) },
		caseToMigrate: { findUnique: mock.fn(async () => null) },
		migrationStep: { update: mock.fn(), updateMany: mock.fn() },
		$queryRaw: mock.fn(async () => []),
		$transaction: mock.fn(async (callback) => callback(databaseClient)),
		$disconnect: mock.fn(async () => {})
	};

	return {
		databaseClient,
		sourceDatabaseClient: { $disconnect: mock.fn(async () => {}) },
		sinkDatabaseClient: { $disconnect: mock.fn(async () => {}) },
		serviceBusClient: { close: mock.fn(async () => {}) },
		dispose: mock.fn(async () => {})
	};
};

// Test data builders
const caseItem = (overrides = {}) => ({
	caseReference: 'CASE-001',
	dataStepId: 10,
	...overrides
});

// Mock call helper
const getCall = (fn, index = 0) => fn.mock.calls[index].arguments[0];

// Assertion helpers
const expectProcessing = (call, id, context) => {
	assert.deepStrictEqual(call.where, { id });
	assert.strictEqual(call.data.status, stepStatus.processing);
	assert.strictEqual(call.data.startedAt instanceof Date, true);
	assert.strictEqual(call.data.invocationId, context.invocationId);
};

const expectComplete = (call, id) => {
	assert.deepStrictEqual(call.where, { id });
	assert.strictEqual(call.data.status, stepStatus.complete);
	assert.strictEqual(call.data.completedAt instanceof Date, true);
};

const expectFailed = (call, id, message) => {
	assert.deepStrictEqual(call.where, { id });
	assert.strictEqual(call.data.status, stepStatus.failed);
	assert.strictEqual(call.data.errorMessage, message);
};

describe('createWorker', () => {
	test('registers a service bus queue handler with correct config', () => {
		let registered;
		mock.method(app, 'serviceBusQueue', (name, options) => {
			registered = { name, connection: options.connection, queueName: options.queueName };
		});

		createWorker('test-worker', 'test-queue', () => mock.fn(), 'dataStepId');
		app.serviceBusQueue.mock.restore();

		assert.deepStrictEqual(registered, {
			name: 'test-worker',
			connection: 'ServiceBusConnection',
			queueName: 'test-queue'
		});
	});

	test('calls migration function with case and context', async () => {
		const service = newService();
		const migration = mock.fn(async () => {});
		const context = newContext();
		const item = caseItem();

		await handleMigration(service, 'test-worker', migration, 'dataStepId', item, context);

		assert.strictEqual(migration.mock.callCount(), 1);
		assert.deepStrictEqual(migration.mock.calls[0].arguments, [item, context]);
	});

	test('sets processing status before migration and complete after', async () => {
		const service = newService();
		const migration = mock.fn(async () => {});
		const context = newContext();
		const item = caseItem();

		await handleMigration(service, 'test-worker', migration, 'dataStepId', item, context);

		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 2);

		const processingCall = getCall(service.databaseClient.migrationStep.update, 0);
		expectProcessing(processingCall, 10, context);

		const completeCall = getCall(service.databaseClient.migrationStep.update, 1);
		expectComplete(completeCall, 10);
	});

	test('marks step as failed with error message on migration failure', async () => {
		const service = newService();
		const error = new Error('migration failed');
		const migration = mock.fn(async function testMigration() {
			throw error;
		});
		const context = newContext();
		const item = caseItem({ caseReference: 'CASE-ERR', dataStepId: 20 });

		await handleMigration(service, 'test-worker', migration, 'dataStepId', item, context);

		assert.strictEqual(context.error.mock.callCount(), 1);
		assert.strictEqual(context.error.mock.calls[0].arguments[0], 'Failed in test-worker for case CASE-ERR:');
		assert.strictEqual(context.error.mock.calls[0].arguments[1], error);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 2);

		const failedCall = getCall(service.databaseClient.migrationStep.update, 1);
		expectFailed(failedCall, 20, 'migration failed');
		assert.strictEqual(failedCall.data.completedAt instanceof Date, true);
	});

	test('uses the correct step id field', async () => {
		const service = newService();
		const migration = mock.fn(async () => {});
		const context = newContext();
		const item = { caseReference: 'CASE-001', documentListStepId: 42 };

		await handleMigration(service, 'doc-worker', migration, 'documentListStepId', item, context);

		const processingCall = getCall(service.databaseClient.migrationStep.update, 0);
		assert.deepStrictEqual(processingCall.where, { id: 42 });

		const completeCall = getCall(service.databaseClient.migrationStep.update, 1);
		assert.deepStrictEqual(completeCall.where, { id: 42 });
		assert.strictEqual(completeCall.data.status, stepStatus.complete);
	});

	test('propagates database update error', async () => {
		const service = newService();
		const migration = mock.fn(async () => {});
		const context = newContext();
		const item = caseItem();
		const error = new Error('database unavailable');

		service.databaseClient.migrationStep.update.mock.mockImplementation(() => {
			throw error;
		});

		await assert.rejects(() => handleMigration(service, 'test-worker', migration, 'dataStepId', item, context), error);
	});

	test('marks step failed after migration error', async () => {
		const service = newService();
		const migration = mock.fn(async () => {
			throw new Error('transient failure');
		});
		const context = newContext();
		const item = { caseReference: 'CASE-002', documentsStepId: 55 };

		await handleMigration(service, 'docs-worker', migration, 'documentsStepId', item, context);

		const failedCall = getCall(service.databaseClient.migrationStep.update, 1);
		expectFailed(failedCall, 55, 'transient failure');
	});

	test('stores string representation when non-Error is thrown', async () => {
		const service = newService();
		const migration = mock.fn(async () => {
			throw 'plain string error';
		});
		const context = newContext();
		const item = caseItem({ dataStepId: 30 });

		await handleMigration(service, 'test-worker', migration, 'dataStepId', item, context);

		const failedCall = getCall(service.databaseClient.migrationStep.update, 1);
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
		const item = { caseReference: 'CASE-010', migrationStepId: 50 };

		await handleMigration(service, 'docs-worker', migration, 'migrationStepId', item, context);

		assert.strictEqual(service.databaseClient.documentToMigrate.count.mock.callCount(), 2);
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.caseToMigrate.findUnique.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 3);

		const caseStepUpdateCall = getCall(service.databaseClient.migrationStep.update, 2);
		assert.deepStrictEqual(caseStepUpdateCall.where, { id: 88 });
		assert.strictEqual(caseStepUpdateCall.data.status, stepStatus.complete);
	});

	test('does not complete case documents step when documents remain incomplete', async () => {
		const service = newService();
		service.databaseClient.documentToMigrate.count.mock.mockImplementation(async () => 2);
		service.databaseClient.$queryRaw.mock.mockImplementation(async () => [{ documentsStepId: 88 }]);
		const migration = mock.fn(async () => {});
		const context = newContext();
		const item = { caseReference: 'CASE-011', migrationStepId: 51 };

		await handleMigration(service, 'docs-worker', migration, 'migrationStepId', item, context);

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
		const item = { caseReference: 'CASE-013', migrationStepId: 53 };

		await handleMigration(service, 'docs-worker', migration, 'migrationStepId', item, context);

		assert.strictEqual(service.databaseClient.documentToMigrate.count.mock.callCount(), 2);
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 3);

		const caseStepUpdateCall = getCall(service.databaseClient.migrationStep.update, 2);
		assert.deepStrictEqual(caseStepUpdateCall.where, { id: 88 });
		assert.strictEqual(caseStepUpdateCall.data.status, stepStatus.failed);
	});

	test('does not complete case documents step when case lookup returns null', async () => {
		const service = newService();
		service.databaseClient.caseToMigrate.findUnique.mock.mockImplementation(async () => null);
		service.databaseClient.$queryRaw.mock.mockImplementation(async () => []);
		const migration = mock.fn(async () => {});
		const context = newContext();
		const item = { caseReference: 'CASE-012', migrationStepId: 52 };

		await handleMigration(service, 'docs-worker', migration, 'migrationStepId', item, context);

		assert.strictEqual(service.databaseClient.documentToMigrate.count.mock.callCount(), 0);
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.caseToMigrate.findUnique.mock.callCount(), 1);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 2);
	});

	test('handleMigrationWithServiceLifecycle calls dispose after successful migration', async () => {
		const mockService = newService();
		const serviceFactory = mock.fn(() => mockService);
		const migration = mock.fn(async () => {});
		const migrationBuilder = mock.fn(() => migration);
		const context = newContext();
		const item = caseItem();

		await handleMigrationWithServiceLifecycle(
			serviceFactory,
			'test-worker',
			migrationBuilder,
			'dataStepId',
			item,
			context
		);

		// Verify the try/finally logic: dispose is called after successful migration
		assert.strictEqual(serviceFactory.mock.callCount(), 1);
		assert.strictEqual(migrationBuilder.mock.callCount(), 1);
		assert.strictEqual(migration.mock.callCount(), 1);
		assert.strictEqual(mockService.dispose.mock.callCount(), 1);
	});

	test('handleMigrationWithServiceLifecycle calls dispose after failed migration', async () => {
		const mockService = newService();
		const serviceFactory = mock.fn(() => mockService);
		const migration = mock.fn(async () => {
			throw new Error('migration failed');
		});
		const migrationBuilder = mock.fn(() => migration);
		const context = newContext();
		const item = caseItem();

		await handleMigrationWithServiceLifecycle(
			serviceFactory,
			'test-worker',
			migrationBuilder,
			'dataStepId',
			item,
			context
		);

		// Verify the try/finally logic: dispose is called even when migration fails
		assert.strictEqual(serviceFactory.mock.callCount(), 1);
		assert.strictEqual(migrationBuilder.mock.callCount(), 1);
		assert.strictEqual(migration.mock.callCount(), 1);
		assert.strictEqual(context.error.mock.callCount(), 1);
		assert.strictEqual(mockService.dispose.mock.callCount(), 1);
	});
});

describe('handleMigration retry behavior', () => {
	// Helper to run migration with common parameters
	const runMigration = (service, migration, item) =>
		handleMigration(service, 'test-worker', migration, 'dataStepId', item, newContext());

	test('retries transaction on transient error and succeeds', async () => {
		const service = newService();
		let callCount = 0;
		service.databaseClient.$transaction.mock.mockImplementation(async (callback) => {
			if (++callCount === 1) throw createPrismaError('P1001');
			return callback(service.databaseClient);
		});

		await runMigration(
			service,
			mock.fn(async () => {}),
			caseItem({ dataStepId: 100 })
		);

		// 1 failed attempt + 2 successful (initial claim + final update)
		assert.strictEqual(service.databaseClient.$transaction.mock.callCount(), 3);
	});

	test('does not retry on non-retryable error', async () => {
		const service = newService();
		service.databaseClient.$transaction.mock.mockImplementation(async () => {
			throw createPrismaError('P2002');
		});

		await assert.rejects(
			() =>
				runMigration(
					service,
					mock.fn(async () => {}),
					caseItem({ dataStepId: 101 })
				),
			(error) => error.code === 'P2002'
		);

		assert.strictEqual(service.databaseClient.$transaction.mock.callCount(), 1);
	});

	test('throws after max retry attempts exhausted', async () => {
		const service = newService();
		service.databaseClient.$transaction.mock.mockImplementation(async () => {
			throw createPrismaError('P1008');
		});

		await assert.rejects(
			() =>
				runMigration(
					service,
					mock.fn(async () => {}),
					caseItem({ dataStepId: 102 })
				),
			(error) => error.code === 'P1008'
		);

		// Max 3 retry attempts
		assert.strictEqual(service.databaseClient.$transaction.mock.callCount(), 3);
	});
});
