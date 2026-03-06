// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { createSourceDatabaseMock } from '../mock-data/database.ts';
import { fetchSourceDocuments } from './documents.ts';

describe('fetchSourceDocuments', () => {
	test('returns documents for case reference', async () => {
		const sourceDatabase = createSourceDatabaseMock();
		const mockDocuments = [
			{ id: 1, caseReference: 'CASE-001' },
			{ id: 2, caseReference: 'CASE-001' }
		];
		sourceDatabase.appealDocument.findMany.mock.mockImplementationOnce(async () => mockDocuments);

		const result = await fetchSourceDocuments(sourceDatabase, 'CASE-001');

		assert.deepStrictEqual(result, mockDocuments);
		assert.deepStrictEqual(sourceDatabase.appealDocument.findMany.mock.calls[0].arguments[0], {
			where: { caseReference: 'CASE-001' }
		});
	});

	test('returns empty array when no documents found', async () => {
		const sourceDatabase = createSourceDatabaseMock();
		sourceDatabase.appealDocument.findMany.mock.mockImplementationOnce(async () => []);

		const result = await fetchSourceDocuments(sourceDatabase, 'CASE-999');

		assert.deepStrictEqual(result, []);
	});
});
