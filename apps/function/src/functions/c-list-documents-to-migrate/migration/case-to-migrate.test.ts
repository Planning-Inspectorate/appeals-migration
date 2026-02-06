// @ts-nocheck
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
	findAvailableCaseForDocumentList,
	processDocumentListStep,
	markDocumentListStepComplete
} from './case-to-migrate.ts';

type FindFirstArgs = Parameters<MigrationDbMock['caseToMigrate']['findFirst']>[0];
type UpdateManyArgs = Parameters<TxMock['migrationStep']['updateMany']>[0];
type UpdateArgs = Parameters<TxMock['migrationStep']['update']>[0];

type MigrationDbMock = {
	caseToMigrate: {
		findFirst: (args: any) => any;
	};
};

type TxMock = {
	migrationStep: {
		updateMany: (args: any) => { count: number };
		update: (args: any) => unknown;
	};
};

describe('case-to-migrate', () => {
	describe('findAvailableCaseForDocumentList', () => {
		test('queries for a case ready for document list and returns it', async () => {
			const findFirst = mock.fn(async () => ({
				caseReference: 'TEST-001',
				documentListStepId: 123
			}));

			const db: MigrationDbMock = {
				caseToMigrate: { findFirst }
			};

			const result = await findAvailableCaseForDocumentList(db as any);

			assert.deepEqual(result, { caseReference: 'TEST-001', documentListStepId: 123 });

			const call = findFirst.mock.calls[0]?.arguments[0] as FindFirstArgs;
			assert.deepEqual(call.where, {
				DocumentListStep: { inProgress: false, complete: false },
				DataStep: { complete: true }
			});
			assert.deepEqual(call.orderBy, { caseReference: 'asc' });
			assert.deepEqual(call.select, { caseReference: true, documentListStepId: true });
		});

		test('returns null when no case is available', async () => {
			const db: MigrationDbMock = {
				caseToMigrate: { findFirst: mock.fn(async () => null) }
			};

			const result = await findAvailableCaseForDocumentList(db as any);

			assert.equal(result, null);
		});
	});

	describe('processDocumentListStep', () => {
		test('claims the step and returns true when updateMany affects 1 row', async () => {
			const updateMany = mock.fn(async () => ({ count: 1 }));

			const tx: TxMock = {
				migrationStep: { updateMany, update: mock.fn() }
			};

			const result = await processDocumentListStep(tx as any, 123);

			assert.equal(result, true);

			const call = updateMany.mock.calls[0]?.arguments[0] as UpdateManyArgs;
			assert.deepEqual(call, {
				where: { id: 123, inProgress: false, complete: false },
				data: { inProgress: true }
			});
		});

		test('returns false when step was already claimed (updateMany count is 0)', async () => {
			const tx: TxMock = {
				migrationStep: {
					updateMany: mock.fn(async () => ({ count: 0 })),
					update: mock.fn()
				}
			};

			const result = await processDocumentListStep(tx as any, 123);

			assert.equal(result, false);
		});
	});

	describe('markDocumentListStepComplete', () => {
		test('updates step to inProgress=false and complete=true', async () => {
			const update = mock.fn(async () => ({}));

			const tx: TxMock = {
				migrationStep: { updateMany: mock.fn(), update }
			};

			await markDocumentListStepComplete(tx as any, 123);

			const call = update.mock.calls[0]?.arguments[0] as UpdateArgs;
			assert.deepEqual(call, {
				where: { id: 123 },
				data: { inProgress: false, complete: true }
			});
		});
	});
});
