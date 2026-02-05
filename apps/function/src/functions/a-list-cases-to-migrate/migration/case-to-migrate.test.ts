// @ts-nocheck
import { describe, test, mock } from 'node:test';
import assert from 'node:assert';
import { upsertCaseReferences } from './case-to-migrate.ts';

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
				DataStep: { create: { inProgress: false, complete: false } },
				DocumentListStep: { create: { inProgress: false, complete: false } },
				DocumentsStep: { create: { inProgress: false, complete: false } },
				ValidationStep: { create: { inProgress: false, complete: false } }
			}
		});

		const call2 = migrationDatabase.caseToMigrate.upsert.mock.calls[1].arguments[0];
		assert.strictEqual(call2.where.caseReference, 'CASE-002');
		assert.strictEqual(call2.create.caseReference, 'CASE-002');
	});
});
