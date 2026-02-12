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
		const migration = mock.fn();
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-001', dataStepId: 10 };

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');
		await handler(caseToMigrate, context);

		assert.strictEqual(migration.mock.callCount(), 1);
		assert.deepStrictEqual(migration.mock.calls[0].arguments, [caseToMigrate, context]);
	});

	test('marks step as complete after successful migration', async () => {
		const service = newService();
		const migration = mock.fn();
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-001', dataStepId: 10 };

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');
		await handler(caseToMigrate, context);

		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 1);
		assert.deepStrictEqual(service.databaseClient.migrationStep.update.mock.calls[0].arguments[0], {
			where: { id: 10 },
			data: { inProgress: false, complete: true }
		});
	});

	test('logs error and still marks step complete on migration failure', async () => {
		const service = newService();
		const error = new Error('migration failed');
		const migration = mock.fn(() => {
			throw error;
		});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-ERR', dataStepId: 20 };

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');
		await handler(caseToMigrate, context);

		assert.strictEqual(context.error.mock.callCount(), 1);
		assert.strictEqual(context.error.mock.calls[0].arguments[0], 'Failed to migrate CASE-ERR');
		assert.strictEqual(context.error.mock.calls[0].arguments[1], error);
		assert.strictEqual(service.databaseClient.migrationStep.update.mock.callCount(), 1);
	});

	test('uses the correct step id field', async () => {
		const service = newService();
		const migration = mock.fn();
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-001', documentListStepId: 42 };

		const handler = captureHandler(service, 'doc-worker', 'doc-queue', migration, 'documentListStepId');
		await handler(caseToMigrate, context);

		assert.deepStrictEqual(service.databaseClient.migrationStep.update.mock.calls[0].arguments[0], {
			where: { id: 42 },
			data: { inProgress: false, complete: true }
		});
	});

	test('propagates database update error', async () => {
		const service = newService();
		const migration = mock.fn();
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-001', dataStepId: 10 };
		const error = new Error('database unavailable');

		service.databaseClient.migrationStep.update.mock.mockImplementation(() => {
			throw error;
		});

		const handler = captureHandler(service, 'test-worker', 'test-queue', migration, 'dataStepId');

		await assert.rejects(() => handler(caseToMigrate, context), error);
	});

	test('marks step complete even after migration error', async () => {
		const service = newService();
		const migration = mock.fn(async () => {
			throw new Error('transient failure');
		});
		const context = newContext();
		const caseToMigrate = { caseReference: 'CASE-002', documentsStepId: 55 };

		const handler = captureHandler(service, 'docs-worker', 'docs-queue', migration, 'documentsStepId');
		await handler(caseToMigrate, context);

		assert.deepStrictEqual(service.databaseClient.migrationStep.update.mock.calls[0].arguments[0], {
			where: { id: 55 },
			data: { inProgress: false, complete: true }
		});
	});
});
