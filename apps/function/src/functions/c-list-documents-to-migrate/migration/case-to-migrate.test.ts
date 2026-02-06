// @ts-nocheck
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { claimNextCaseForDocumentList, updateDocumentListStepComplete } from './case-to-migrate.ts';

type FindFirstArgs = Parameters<TxMock['caseToMigrate']['findFirst']>[0];
type UpdateArgs = Parameters<TxMock['migrationStep']['update']>[0];
type CaseUpdateArgs = Parameters<MigrationDbMock['caseToMigrate']['update']>[0];

type MigrationDbMock = {
	$transaction: (callback: (tx: any) => Promise<any>) => Promise<any>;
	caseToMigrate: {
		update: (args: any) => Promise<any>;
	};
};

type TxMock = {
	caseToMigrate: {
		findFirst: (args: any) => Promise<any>;
	};
	migrationStep: {
		update: (args: any) => Promise<any>;
	};
};

describe('case-to-migrate', () => {
	describe('claimNextCaseForDocumentList', () => {
		test('atomically finds and claims a case', async () => {
			const findFirst = mock.fn(async () => ({
				caseReference: 'TEST-001',
				documentListStepId: 123
			}));

			const update = mock.fn(async () => ({}));

			const tx: TxMock = {
				caseToMigrate: { findFirst },
				migrationStep: { update }
			};

			const db: MigrationDbMock = {
				$transaction: mock.fn(async (callback) => callback(tx)),
				caseToMigrate: { update: mock.fn() }
			};

			const result = await claimNextCaseForDocumentList(db as any);

			assert.deepEqual(result, { caseReference: 'TEST-001', documentListStepId: 123 });

			const findCall = findFirst.mock.calls[0]?.arguments[0] as FindFirstArgs;
			assert.deepEqual(findCall.where, {
				DocumentListStep: { inProgress: false, complete: false },
				DataStep: { complete: true }
			});
			assert.deepEqual(findCall.orderBy, { caseReference: 'asc' });
			assert.deepEqual(findCall.select, { caseReference: true, documentListStepId: true });

			const updateCall = update.mock.calls[0]?.arguments[0] as UpdateArgs;
			assert.deepEqual(updateCall, {
				where: { id: 123 },
				data: { inProgress: true }
			});
		});

		test('returns null when no case is available', async () => {
			const tx: TxMock = {
				caseToMigrate: { findFirst: mock.fn(async () => null) },
				migrationStep: { update: mock.fn() }
			};

			const db: MigrationDbMock = {
				$transaction: mock.fn(async (callback) => callback(tx)),
				caseToMigrate: { update: mock.fn() }
			};

			const result = await claimNextCaseForDocumentList(db as any);

			assert.equal(result, null);
		});
	});

	describe('updateDocumentListStepComplete', () => {
		test('updates step to inProgress=false and complete=true', async () => {
			const update = mock.fn(async () => ({}));

			const db: MigrationDbMock = {
				$transaction: mock.fn(),
				caseToMigrate: { update }
			};

			await updateDocumentListStepComplete(db as any, 'TEST-001', true);

			const call = update.mock.calls[0]?.arguments[0] as CaseUpdateArgs;
			assert.deepEqual(call, {
				where: { caseReference: 'TEST-001' },
				data: {
					DocumentListStep: {
						update: {
							inProgress: false,
							complete: true
						}
					}
				}
			});
		});

		test('can mark step as incomplete', async () => {
			const update = mock.fn(async () => ({}));

			const db: MigrationDbMock = {
				$transaction: mock.fn(),
				caseToMigrate: { update }
			};

			await updateDocumentListStepComplete(db as any, 'TEST-001', false);

			const call = update.mock.calls[0]?.arguments[0] as CaseUpdateArgs;
			assert.deepEqual(call.data.DocumentListStep.update.complete, false);
		});
	});
});
