// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { upsertCaseReferences } from './case-to-migrate.ts';

const createPrismaError = (code: string) => Object.assign(new Error(`Prisma error ${code}`), { code });

describe('upsertCaseReferences', () => {
	const newMigrationDatabase = () => ({
		caseToMigrate: { upsert: mock.fn() }
	});

	test('does nothing when array is empty', async () => {
		const migrationDatabase = newMigrationDatabase();

		await upsertCaseReferences(migrationDatabase, []);

		assert.strictEqual(migrationDatabase.caseToMigrate.upsert.mock.callCount(), 0);
	});

	test('upserts each case reference with nested migration steps', async () => {
		const migrationDatabase = newMigrationDatabase();

		await upsertCaseReferences(migrationDatabase, ['CASE-001', 'CASE-002']);

		assert.strictEqual(migrationDatabase.caseToMigrate.upsert.mock.callCount(), 2);

		const call1 = migrationDatabase.caseToMigrate.upsert.mock.calls[0].arguments[0];
		assert.deepStrictEqual(call1, {
			where: { caseReference: 'CASE-001' },
			update: {},
			create: {
				caseReference: 'CASE-001',
				DataStep: { create: {} },
				DocumentListStep: { create: {} },
				DocumentsStep: { create: {} },
				ValidationStep: { create: {} }
			}
		});

		const call2 = migrationDatabase.caseToMigrate.upsert.mock.calls[1].arguments[0];
		assert.strictEqual(call2.where.caseReference, 'CASE-002');
		assert.strictEqual(call2.create.caseReference, 'CASE-002');
	});

	test('retries on transient Prisma error and succeeds', async () => {
		const migrationDatabase = newMigrationDatabase();
		let callCount = 0;
		migrationDatabase.caseToMigrate.upsert.mock.mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				throw createPrismaError('P1001');
			}
			return Promise.resolve();
		});

		await upsertCaseReferences(migrationDatabase, ['CASE-001']);

		assert.strictEqual(migrationDatabase.caseToMigrate.upsert.mock.callCount(), 2);
	});

	test('throws after max retry attempts exhausted', async () => {
		const migrationDatabase = newMigrationDatabase();
		const error = createPrismaError('P1001');
		migrationDatabase.caseToMigrate.upsert.mock.mockImplementation(() => {
			throw error;
		});

		await assert.rejects(
			() => upsertCaseReferences(migrationDatabase, ['CASE-001']),
			(thrown) => {
				assert.strictEqual(thrown, error);
				return true;
			}
		);

		assert.strictEqual(migrationDatabase.caseToMigrate.upsert.mock.callCount(), 3);
	});

	test('does not retry on non-retryable Prisma error', async () => {
		const migrationDatabase = newMigrationDatabase();
		const error = createPrismaError('P2002');
		migrationDatabase.caseToMigrate.upsert.mock.mockImplementation(() => {
			throw error;
		});

		await assert.rejects(
			() => upsertCaseReferences(migrationDatabase, ['CASE-001']),
			(thrown) => {
				assert.strictEqual(thrown, error);
				return true;
			}
		);

		assert.strictEqual(migrationDatabase.caseToMigrate.upsert.mock.callCount(), 1);
	});
});
