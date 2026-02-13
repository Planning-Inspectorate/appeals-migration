// @ts-nocheck
import { app } from '@azure/functions';
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { createWorker } from './worker.ts';

describe('createWorker', () => {
	const newContext = () => ({
		log: mock.fn(),
		error: mock.fn(),
		invocationId: 'test-invocation-id'
	});

	const newService = () => ({
		databaseClient: {
			migrationStep: {
				update: mock.fn()
			}
		}
	});

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
		assert.strictEqual(processingCall.data.status, 'processing');
		assert.ok(processingCall.data.startedAt instanceof Date);
		assert.strictEqual(processingCall.data.invocationId, 'test-invocation-id');

		const completeCall = service.databaseClient.migrationStep.update.mock.calls[1].arguments[0];
		assert.deepStrictEqual(completeCall.where, { id: 10 });
		assert.strictEqual(completeCall.data.status, 'complete');
		assert.ok(completeCall.data.completedAt instanceof Date);
	});

	test('marks step as failed with error message on migration failure', async () => {
		const service = newService();
		const error = new Error('migration failed');
		const migration = mock.fn(async () => {
			throw error;
		});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-ERR', dataStepId: 20 };

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');
		await handler(caseToMigrate, context);

		assert.strictEqual(context.error.mock.callCount(), 1);
		assert.strictEqual(context.error.mock.calls[0].arguments[0], 'Failed to migrate CASE-ERR');
		assert.strictEqual(context.error.mock.calls[0].arguments[1], error);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 2);

		const failedCall = service.databaseClient.migrationStep.update.mock.calls[1].arguments[0];
		assert.deepStrictEqual(failedCall.where, { id: 20 });
		assert.strictEqual(failedCall.data.status, 'failed');
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
		assert.strictEqual(completeCall.data.status, 'complete');
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
		assert.strictEqual(failedCall.data.status, 'failed');
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
		assert.strictEqual(failedCall.data.status, 'failed');
		assert.strictEqual(failedCall.data.errorMessage, 'plain string error');
	});
});
