// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { createSinkDatabaseMock } from '../mock-data/database.ts';
import { fetchSinkDocuments } from './documents.ts';

describe('fetchSinkDocuments', () => {
	test('returns documents with versions for case reference', async () => {
		const sinkDatabase = createSinkDatabaseMock();
		const mockDocuments = [
			{ id: 1, guid: 'doc-123', versions: [{ version: 1 }] },
			{ id: 2, guid: 'doc-456', versions: [{ version: 1 }, { version: 2 }] }
		];
		sinkDatabase.appeal.findUnique.mock.mockImplementationOnce(async () => ({ id: 100 }));
		sinkDatabase.document.findMany.mock.mockImplementationOnce(async () => mockDocuments);

		const result = await fetchSinkDocuments(sinkDatabase, 'CASE-001');

		assert.deepStrictEqual(result, mockDocuments);
		assert.deepStrictEqual(sinkDatabase.appeal.findUnique.mock.calls[0].arguments[0], {
			where: { reference: 'CASE-001' },
			select: { id: true }
		});
		assert.deepStrictEqual(sinkDatabase.document.findMany.mock.calls[0].arguments[0], {
			where: { caseId: 100 },
			include: { versions: true }
		});
	});

	test('returns empty array when appeal not found', async () => {
		const sinkDatabase = createSinkDatabaseMock();
		sinkDatabase.appeal.findUnique.mock.mockImplementationOnce(async () => null);

		const result = await fetchSinkDocuments(sinkDatabase, 'CASE-999');

		assert.deepStrictEqual(result, []);
		assert.strictEqual(sinkDatabase.document.findMany.mock.callCount(), 0);
	});

	test('returns empty array when no documents found', async () => {
		const sinkDatabase = createSinkDatabaseMock();
		sinkDatabase.appeal.findUnique.mock.mockImplementationOnce(async () => ({ id: 100 }));
		sinkDatabase.document.findMany.mock.mockImplementationOnce(async () => []);

		const result = await fetchSinkDocuments(sinkDatabase, 'CASE-001');

		assert.deepStrictEqual(result, []);
	});
});
