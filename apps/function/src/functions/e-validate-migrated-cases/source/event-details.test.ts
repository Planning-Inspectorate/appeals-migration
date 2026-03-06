// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { createSourceDatabaseMock } from '../mock-data/database.ts';
import { fetchSourceEvents } from './event-details.ts';

describe('fetchSourceEvents', () => {
	test('returns events ordered by start date', async () => {
		const sourceDatabase = createSourceDatabaseMock();
		const mockEvents = [
			{ eventId: 1, eventStartDateTime: '2024-07-01T10:00:00.000Z' },
			{ eventId: 2, eventStartDateTime: '2024-07-15T09:00:00.000Z' }
		];
		sourceDatabase.appealEvent.findMany.mock.mockImplementationOnce(async () => mockEvents);

		const result = await fetchSourceEvents(sourceDatabase, 'CASE-001');

		assert.deepStrictEqual(result, mockEvents);
		assert.deepStrictEqual(sourceDatabase.appealEvent.findMany.mock.calls[0].arguments[0], {
			where: { caseReference: 'CASE-001' },
			orderBy: { eventStartDateTime: 'asc' }
		});
	});

	test('returns empty array when no events found', async () => {
		const sourceDatabase = createSourceDatabaseMock();
		sourceDatabase.appealEvent.findMany.mock.mockImplementationOnce(async () => []);

		const result = await fetchSourceEvents(sourceDatabase, 'CASE-999');

		assert.deepStrictEqual(result, []);
	});
});
