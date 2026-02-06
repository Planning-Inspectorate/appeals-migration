// @ts-nocheck
import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { upsertDocumentsToMigrate } from './document-to-migrate.ts';

type TxMock = {
	documentToMigrate: {
		upsert: (args: any) => unknown;
	};
};

describe('document-to-migrate', () => {
	test('does nothing when documents array is empty', async () => {
		const upsert = mock.fn(async () => ({}));
		const tx: TxMock = { documentToMigrate: { upsert } };

		await upsertDocumentsToMigrate(tx as any, []);

		assert.equal(upsert.mock.calls.length, 0);
	});

	test('upserts one record per document with correct payload', async () => {
		const upsert = mock.fn(async () => ({}));
		const tx: TxMock = { documentToMigrate: { upsert } };

		const documents = [
			{ documentId: 'DOC-1', caseReference: 'CASE-1' },
			{ documentId: 'DOC-2', caseReference: 'CASE-1' }
		];

		await upsertDocumentsToMigrate(tx as any, documents as any);

		assert.equal(upsert.mock.calls.length, 2);

		const firstCallArgs = upsert.mock.calls[0].arguments[0];
		assert.deepEqual(firstCallArgs.where, { documentId: 'DOC-1' });
		assert.deepEqual(firstCallArgs.update, {});
		assert.deepEqual(firstCallArgs.create, {
			documentId: 'DOC-1',
			caseReference: 'CASE-1',
			MigrationStep: {
				create: {
					inProgress: false,
					complete: false
				}
			}
		});

		const secondCallArgs = upsert.mock.calls[1].arguments[0];
		assert.deepEqual(secondCallArgs.where, { documentId: 'DOC-2' });
		assert.deepEqual(secondCallArgs.update, {});
		assert.deepEqual(secondCallArgs.create, {
			documentId: 'DOC-2',
			caseReference: 'CASE-1',
			MigrationStep: {
				create: {
					inProgress: false,
					complete: false
				}
			}
		});
	});
});
