// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { buildMigrateData } from './impl.ts';

describe('buildMigrateData', () => {
	const newService = () => ({
		databaseClient: { db: 'migration' },
		sourceDatabaseClient: { db: 'source' },
		sinkDatabaseClient: { db: 'sink' }
	});

	const newSource = () => ({
		fetchCaseDetails: mock.fn()
	});

	const newMappers = () => ({
		mapSourceToSinkAppeal: mock.fn()
	});

	const newSink = () => ({
		upsertAppeal: mock.fn()
	});

	test('successfully processes a case and creates new appeal', async () => {
		const service = newService();
		const source = newSource();
		const mappers = newMappers();
		const sink = newSink();
		const context = { log: mock.fn(), error: mock.fn() };

		const caseToMigrate = { caseReference: 'CASE-001', dataStepId: 1 };
		const mockCaseDetails = { type: 'has', data: { caseReference: 'CASE-001' } };
		const mockMappedAppeal = { reference: 'CASE-001' };
		const mockResult = { existed: false, appeal: { id: 1, reference: 'CASE-001' } };

		source.fetchCaseDetails.mock.mockImplementationOnce(() => mockCaseDetails);
		mappers.mapSourceToSinkAppeal.mock.mockImplementationOnce(() => mockMappedAppeal);
		sink.upsertAppeal.mock.mockImplementationOnce(() => mockResult);

		const handler = buildMigrateData(service, source, mappers, sink);
		await handler(caseToMigrate, context);

		assert.strictEqual(source.fetchCaseDetails.mock.callCount(), 1);
		assert.strictEqual(mappers.mapSourceToSinkAppeal.mock.callCount(), 1);
		assert.strictEqual(sink.upsertAppeal.mock.callCount(), 1);
		assert.strictEqual(context.log.mock.calls[1].arguments[0], 'Case CASE-001 successfully migrated to sink database');
	});

	test('logs message when case already exists in sink database', async () => {
		const service = newService();
		const source = newSource();
		const mappers = newMappers();
		const sink = newSink();
		const context = { log: mock.fn(), error: mock.fn() };

		const caseToMigrate = { caseReference: 'CASE-002', dataStepId: 2 };
		const mockCaseDetails = { type: 's78', data: { caseReference: 'CASE-002' } };
		const mockMappedAppeal = { reference: 'CASE-002' };
		const mockResult = { existed: true, appeal: { id: 2, reference: 'CASE-002' } };

		source.fetchCaseDetails.mock.mockImplementationOnce(() => mockCaseDetails);
		mappers.mapSourceToSinkAppeal.mock.mockImplementationOnce(() => mockMappedAppeal);
		sink.upsertAppeal.mock.mockImplementationOnce(() => mockResult);

		const handler = buildMigrateData(service, source, mappers, sink);
		await handler(caseToMigrate, context);

		assert.strictEqual(context.log.mock.calls[1].arguments[0], 'Case CASE-002 already exists in sink database');
	});

	test('throws when case not found in source database', async () => {
		const service = newService();
		const source = newSource();
		const mappers = newMappers();
		const sink = newSink();
		const context = { log: mock.fn(), error: mock.fn() };

		const caseToMigrate = { caseReference: 'CASE-999', dataStepId: 3 };

		source.fetchCaseDetails.mock.mockImplementationOnce(() => null);

		const handler = buildMigrateData(service, source, mappers, sink);

		await assert.rejects(() => handler(caseToMigrate, context), {
			message: 'Case CASE-999 not found in source database'
		});
		assert.strictEqual(mappers.mapSourceToSinkAppeal.mock.callCount(), 0);
		assert.strictEqual(sink.upsertAppeal.mock.callCount(), 0);
	});

	test('propagates errors from source fetch', async () => {
		const service = newService();
		const source = newSource();
		const mappers = newMappers();
		const sink = newSink();
		const context = { log: mock.fn(), error: mock.fn() };

		const caseToMigrate = { caseReference: 'CASE-ERR', dataStepId: 99 };
		const error = new Error('Database connection failed');
		source.fetchCaseDetails.mock.mockImplementationOnce(() => {
			throw error;
		});

		const handler = buildMigrateData(service, source, mappers, sink);

		await assert.rejects(() => handler(caseToMigrate, context), error);
	});
});
