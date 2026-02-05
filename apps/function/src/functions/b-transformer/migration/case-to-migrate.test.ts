// @ts-nocheck
import { describe, test, mock } from 'node:test';
import assert from 'node:assert';
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
			where: { DataStep: { inProgress: false, complete: false } },
			orderBy: { caseReference: 'asc' }
		});
		assert.deepStrictEqual(migrationDatabase.migrationStep.update.mock.calls[0].arguments[0], {
			where: { id: 1 },
			data: { inProgress: true }
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
	test('updates complete flag and sets inProgress to false', async () => {
		const migrationDatabase = {
			caseToMigrate: {
				update: mock.fn(() => Promise.resolve({ caseReference: 'CASE-001', dataStepId: 1 }))
			}
		};

		await updateDataStepComplete(migrationDatabase, 'CASE-001', true);

		assert.deepStrictEqual(migrationDatabase.caseToMigrate.update.mock.calls[0].arguments[0], {
			where: { caseReference: 'CASE-001' },
			data: {
				DataStep: {
					update: {
						inProgress: false,
						complete: true
					}
				}
			}
		});
	});

	test('throws error when case not found', async () => {
		const migrationDatabase = {
			caseToMigrate: {
				update: mock.fn(() => Promise.reject({ code: 'P2001', message: 'Record not found' }))
			}
		};

		await assert.rejects(() => updateDataStepComplete(migrationDatabase, 'CASE-999', true), {
			message: 'Case CASE-999 not found'
		});
	});
});
