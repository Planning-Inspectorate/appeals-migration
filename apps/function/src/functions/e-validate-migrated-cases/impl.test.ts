// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { buildValidateMigratedCases } from './impl.ts';

describe('buildValidateMigratedCases', () => {
	const newService = () => ({
		databaseClient: {
			caseToMigrate: {
				update: mock.fn()
			}
		},
		sourceDatabaseClient: { db: 'source' },
		sinkDatabaseClient: { db: 'sink' }
	});

	const newSource = () => ({
		fetchSourceCaseDetails: mock.fn(),
		fetchSourceDocuments: mock.fn(() => []),
		fetchSourceEvents: mock.fn(() => []),
		fetchSourceServiceUsers: mock.fn(() => [])
	});

	const newSink = () => ({
		fetchSinkCaseDetails: mock.fn()
	});

	const newValidators = () => ({
		validateData: mock.fn(),
		validateDocuments: mock.fn()
	});

	test('saves validation results when both data and documents pass', async () => {
		const service = newService();
		const source = newSource();
		const sink = newSink();
		const validators = newValidators();
		const context = { log: mock.fn() };

		source.fetchSourceCaseDetails.mock.mockImplementationOnce(() => ({
			type: 'has',
			data: { caseReference: 'CASE-001' }
		}));
		sink.fetchSinkCaseDetails.mock.mockImplementationOnce(() => ({ reference: 'CASE-001' }));
		validators.validateData.mock.mockImplementationOnce(() => true);
		validators.validateDocuments.mock.mockImplementationOnce(() => true);

		const handler = buildValidateMigratedCases(service, source, sink, validators);
		await handler({ caseReference: 'CASE-001' }, context);

		assert.strictEqual(service.databaseClient.caseToMigrate.update.mock.callCount(), 1);
		assert.deepStrictEqual(service.databaseClient.caseToMigrate.update.mock.calls[0].arguments[0], {
			where: { caseReference: 'CASE-001' },
			data: {
				dataValidated: true,
				documentsValidated: true
			}
		});
	});

	test('saves validation results when data passes but documents fail', async () => {
		const service = newService();
		const source = newSource();
		const sink = newSink();
		const validators = newValidators();
		const context = { log: mock.fn() };

		source.fetchSourceCaseDetails.mock.mockImplementationOnce(() => ({
			type: 's78',
			data: { caseReference: 'CASE-002' }
		}));
		sink.fetchSinkCaseDetails.mock.mockImplementationOnce(() => ({ reference: 'CASE-002' }));
		validators.validateData.mock.mockImplementationOnce(() => true);
		validators.validateDocuments.mock.mockImplementationOnce(() => false);

		const handler = buildValidateMigratedCases(service, source, sink, validators);
		await handler({ caseReference: 'CASE-002' }, context);

		assert.deepStrictEqual(service.databaseClient.caseToMigrate.update.mock.calls[0].arguments[0], {
			where: { caseReference: 'CASE-002' },
			data: {
				dataValidated: true,
				documentsValidated: false
			}
		});
	});

	test('throws when source case not found', async () => {
		const service = newService();
		const source = newSource();
		const sink = newSink();
		const validators = newValidators();
		const context = { log: mock.fn() };

		source.fetchSourceCaseDetails.mock.mockImplementationOnce(() => null);
		sink.fetchSinkCaseDetails.mock.mockImplementationOnce(() => ({ reference: 'CASE-999' }));

		const handler = buildValidateMigratedCases(service, source, sink, validators);

		await assert.rejects(() => handler({ caseReference: 'CASE-999' }, context), {
			message: 'Case CASE-999 not found in source database'
		});
		assert.strictEqual(service.databaseClient.caseToMigrate.update.mock.callCount(), 0);
	});

	test('throws when sink case not found', async () => {
		const service = newService();
		const source = newSource();
		const sink = newSink();
		const validators = newValidators();
		const context = { log: mock.fn() };

		source.fetchSourceCaseDetails.mock.mockImplementationOnce(() => ({ type: 'has', data: {} }));
		sink.fetchSinkCaseDetails.mock.mockImplementationOnce(() => null);

		const handler = buildValidateMigratedCases(service, source, sink, validators);

		await assert.rejects(() => handler({ caseReference: 'CASE-999' }, context), {
			message: 'Case CASE-999 not found in sink database'
		});
		assert.strictEqual(service.databaseClient.caseToMigrate.update.mock.callCount(), 0);
	});

	test('propagates errors from validators', async () => {
		const service = newService();
		const source = newSource();
		const sink = newSink();
		const validators = newValidators();
		const context = { log: mock.fn() };

		const error = new Error('Validation failed unexpectedly');
		source.fetchSourceCaseDetails.mock.mockImplementationOnce(() => ({ type: 'has', data: {} }));
		sink.fetchSinkCaseDetails.mock.mockImplementationOnce(() => ({ reference: 'CASE-001' }));
		validators.validateData.mock.mockImplementationOnce(() => {
			throw error;
		});

		const handler = buildValidateMigratedCases(service, source, sink, validators);

		await assert.rejects(() => handler({ caseReference: 'CASE-001' }, context), error);
	});
});
