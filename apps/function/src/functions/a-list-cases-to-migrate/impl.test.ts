// @ts-nocheck
import { describe, test, mock } from 'node:test';
import assert from 'node:assert';
import { buildListCasesToMigrate } from './impl.ts';

describe('buildListCasesToMigrate', () => {
	const newService = () => ({
		databaseClient: { db: 'migration' },
		sourceDatabaseClient: { db: 'source' }
	});

	const newMigration = () => ({
		readToMigrateParameters: mock.fn(),
		upsertCaseReferences: mock.fn()
	});

	const newMappers = () => ({
		mapToMigrateParameterToWhere: mock.fn()
	});

	const newSource = () => ({
		fetchCaseReferences: mock.fn()
	});

	test('reads params, maps, fetches refs, deduplicates, and upserts', async () => {
		const service = newService();
		const migration = newMigration();
		const mappers = newMappers();
		const source = newSource();
		const context = { log: mock.fn() };

		migration.readToMigrateParameters.mock.mockImplementationOnce(() => [
			{ id: 1, status: 'open' },
			{ id: 2, status: 'closed' }
		]);

		mappers.mapToMigrateParameterToWhere.mock.mockImplementation((p) => ({ caseStatus: p.status }));

		source.fetchCaseReferences.mock.mockImplementation((_sourceDb, hasWhere) => {
			if (hasWhere.caseStatus === 'open') return ['CASE-001', 'CASE-002', 'CASE-001'];
			if (hasWhere.caseStatus === 'closed') return ['CASE-002', 'CASE-003'];
			return [];
		});

		migration.upsertCaseReferences.mock.mockImplementation(() => {});

		const handler = buildListCasesToMigrate(service, migration, mappers, source);
		await handler({}, context);

		assert.strictEqual(migration.readToMigrateParameters.mock.callCount(), 1);
		assert.strictEqual(source.fetchCaseReferences.mock.callCount(), 2);
		assert.strictEqual(migration.upsertCaseReferences.mock.callCount(), 1);

		assert.deepStrictEqual(migration.upsertCaseReferences.mock.calls[0].arguments[0], service.databaseClient);
		assert.deepStrictEqual(migration.upsertCaseReferences.mock.calls[0].arguments[1], [
			'CASE-001',
			'CASE-002',
			'CASE-003'
		]);
	});

	test('logs error and rethrows on failure', async () => {
		const service = newService();
		const migration = newMigration();
		const mappers = newMappers();
		const source = newSource();
		const context = { log: mock.fn(), error: mock.fn() };

		const error = new Error('Read failed');
		migration.readToMigrateParameters.mock.mockImplementationOnce(() => {
			throw error;
		});

		const handler = buildListCasesToMigrate(service, migration, mappers, source);

		await assert.rejects(() => handler({}, context), error);
		assert.strictEqual(context.error.mock.callCount(), 1);
		assert.strictEqual(context.error.mock.calls[0].arguments[0], 'Error during list builder run');
		assert.strictEqual(context.error.mock.calls[0].arguments[1], error);
	});
});
