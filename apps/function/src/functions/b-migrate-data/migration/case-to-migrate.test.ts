// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { claimNextCaseToMigrate, updateDataStepComplete } from './case-to-migrate.ts';

describe('claimNextCaseToMigrate', () => {
	test('claims and returns case with incomplete DataStep', async () => {
		const migrationDatabase = {
			$transaction: mock.fn(),
			caseToMigrate: { findFirst: mock.fn() },
			migrationStep: { update: mock.fn() }
		};
		const mockCase = { caseReference: 'CASE-001', dataStepId: 1 };

		migrationDatabase.$transaction.mock.mockImplementationOnce(async (callback) => {
			return await callback(migrationDatabase);
		});
		migrationDatabase.caseToMigrate.findFirst.mock.mockImplementationOnce(() => mockCase);
		migrationDatabase.migrationStep.update.mock.mockImplementationOnce(() => ({ id: 1 }));

		const result = await claimNextCaseToMigrate(migrationDatabase);

		assert.deepStrictEqual(result, mockCase);
		assert.deepStrictEqual(migrationDatabase.caseToMigrate.findFirst.mock.calls[0].arguments[0], {
			where: { DataStep: { status: 'waiting' } },
			orderBy: { caseReference: 'asc' }
		});
		assert.deepStrictEqual(migrationDatabase.migrationStep.update.mock.calls[0].arguments[0], {
			where: { id: 1 },
			data: { status: 'queued' }
		});
	});

	test('returns null when no cases available', async () => {
		const migrationDatabase = {
			$transaction: mock.fn(),
			caseToMigrate: { findFirst: mock.fn() },
			migrationStep: { update: mock.fn() }
		};

		migrationDatabase.$transaction.mock.mockImplementationOnce(async (callback) => {
			return await callback(migrationDatabase);
		});
		migrationDatabase.caseToMigrate.findFirst.mock.mockImplementationOnce(() => null);

		const result = await claimNextCaseToMigrate(migrationDatabase);

		assert.strictEqual(result, null);
		assert.strictEqual(migrationDatabase.migrationStep.update.mock.callCount(), 0);
	});
});

describe('updateDataStepComplete', () => {
	test('updates status to the given value', async () => {
		const migrationDatabase = {
			caseToMigrate: {
				update: mock.fn(() => Promise.resolve({ caseReference: 'CASE-001', dataStepId: 1 }))
			}
		};

		await updateDataStepComplete(migrationDatabase, 'CASE-001', 'complete');

		const call = migrationDatabase.caseToMigrate.update.mock.calls[0].arguments[0];
		assert.deepStrictEqual(call.where, { caseReference: 'CASE-001' });
		assert.strictEqual(call.data.DataStep.update.status, 'complete');
		assert.ok(call.data.DataStep.update.completedAt instanceof Date);
		assert.strictEqual(call.data.DataStep.update.errorMessage, undefined);
	});

	test('throws error when case not found', async () => {
		const migrationDatabase = {
			caseToMigrate: {
				update: mock.fn(() => Promise.reject({ code: 'P2001', message: 'Record not found' }))
			}
		};

		await assert.rejects(() => updateDataStepComplete(migrationDatabase, 'CASE-999', 'complete', undefined), {
			message: 'Case CASE-999 not found'
		});
	});
});
