// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { buildHealthCheck } from './impl.ts';

describe('buildHealthCheck', () => {
	const newService = () => ({
		databaseClient: { db: 'migration' },
		sourceDatabaseClient: { db: 'source' },
		sinkDatabaseClient: { db: 'sink' }
	});

	const newDatabase = () => ({
		checkMigrationDatabase: mock.fn(async () => {}),
		checkOdwDatabase: mock.fn(async () => {}),
		checkManageAppealsDatabase: mock.fn(async () => {})
	});

	test('returns OK for all databases when checks succeed', async () => {
		const service = newService();
		const database = newDatabase();

		const handler = buildHealthCheck(service, database);
		const response = await handler({}, {});

		assert.strictEqual(response.status, 200);
		assert.deepStrictEqual(response.jsonBody, {
			migrationDatabase: 'OK',
			odwDatabase: 'OK',
			manageAppealsDatabase: 'OK'
		});
	});

	test('returns ERROR with message when single database fails', async () => {
		const service = newService();
		const database = newDatabase();
		database.checkOdwDatabase.mock.mockImplementationOnce(async () => {
			throw new Error('Connection timeout');
		});

		const handler = buildHealthCheck(service, database);
		const response = await handler({}, {});

		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.jsonBody.migrationDatabase, 'OK');
		assert.strictEqual(response.jsonBody.odwDatabase, 'ERROR');
		assert.strictEqual(response.jsonBody.odwDatabaseError, 'Connection timeout');
		assert.strictEqual(response.jsonBody.manageAppealsDatabase, 'OK');
		assert.strictEqual(response.jsonBody.migrationDatabaseError, undefined);
		assert.strictEqual(response.jsonBody.manageAppealsDatabaseError, undefined);
	});

	test('returns ERROR with messages when multiple databases fail', async () => {
		const service = newService();
		const database = newDatabase();
		database.checkMigrationDatabase.mock.mockImplementationOnce(async () => {
			throw new Error('Migration DB unavailable');
		});
		database.checkManageAppealsDatabase.mock.mockImplementationOnce(async () => {
			throw new Error('Manage Appeals DB unavailable');
		});

		const handler = buildHealthCheck(service, database);
		const response = await handler({}, {});

		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.jsonBody.migrationDatabase, 'ERROR');
		assert.strictEqual(response.jsonBody.migrationDatabaseError, 'Migration DB unavailable');
		assert.strictEqual(response.jsonBody.odwDatabase, 'OK');
		assert.strictEqual(response.jsonBody.manageAppealsDatabase, 'ERROR');
		assert.strictEqual(response.jsonBody.manageAppealsDatabaseError, 'Manage Appeals DB unavailable');
	});

	test('handles non-Error thrown values', async () => {
		const service = newService();
		const database = newDatabase();
		database.checkMigrationDatabase.mock.mockImplementationOnce(async () => {
			throw 'string error';
		});

		const handler = buildHealthCheck(service, database);
		const response = await handler({}, {});

		assert.strictEqual(response.jsonBody.migrationDatabase, 'ERROR');
		assert.strictEqual(response.jsonBody.migrationDatabaseError, 'string error');
	});

	test('passes correct clients to check functions', async () => {
		const service = newService();
		const database = newDatabase();

		const handler = buildHealthCheck(service, database);
		await handler({}, {});

		assert.strictEqual(database.checkMigrationDatabase.mock.callCount(), 1);
		assert.strictEqual(database.checkMigrationDatabase.mock.calls[0].arguments[0], service.databaseClient);
		assert.strictEqual(database.checkOdwDatabase.mock.callCount(), 1);
		assert.strictEqual(database.checkOdwDatabase.mock.calls[0].arguments[0], service.sourceDatabaseClient);
		assert.strictEqual(database.checkManageAppealsDatabase.mock.callCount(), 1);
		assert.strictEqual(database.checkManageAppealsDatabase.mock.calls[0].arguments[0], service.sinkDatabaseClient);
	});

	test('uses default database checks with $queryRaw when no database param provided', async () => {
		const service = {
			databaseClient: { $queryRaw: mock.fn(async () => [{ result: 1 }]) },
			sourceDatabaseClient: { $queryRaw: mock.fn(async () => [{ result: 1 }]) },
			sinkDatabaseClient: { $queryRaw: mock.fn(async () => [{ result: 1 }]) }
		};

		const handler = buildHealthCheck(service);
		const response = await handler({}, {});

		assert.strictEqual(response.status, 200);
		assert.strictEqual(response.jsonBody.migrationDatabase, 'OK');
		assert.strictEqual(response.jsonBody.odwDatabase, 'OK');
		assert.strictEqual(response.jsonBody.manageAppealsDatabase, 'OK');
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(service.sourceDatabaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(service.sinkDatabaseClient.$queryRaw.mock.callCount(), 1);
	});
});
