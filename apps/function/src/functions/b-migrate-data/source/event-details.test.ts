// @ts-nocheck
import { describe, test, mock } from 'node:test';
import assert from 'node:assert';
import { fetchEventDetails } from './event-details.ts';

describe('fetchEventDetails', () => {
	test('returns all events for a case reference', async () => {
		const sourceDatabase = {
			appealEvent: { findMany: mock.fn() }
		};

		const mockEvents = [
			{ eventId: '1', caseReference: 'CASE-001', eventType: 'hearing' },
			{ eventId: '2', caseReference: 'CASE-001', eventType: 'inquiry' }
		];
		sourceDatabase.appealEvent.findMany.mock.mockImplementationOnce(() => mockEvents);

		const result = await fetchEventDetails(sourceDatabase, 'CASE-001');

		assert.deepStrictEqual(result, mockEvents);
		assert.strictEqual(sourceDatabase.appealEvent.findMany.mock.callCount(), 1);
		assert.deepStrictEqual(sourceDatabase.appealEvent.findMany.mock.calls[0].arguments[0], {
			where: { caseReference: 'CASE-001' },
			orderBy: { eventStartDateTime: 'asc' }
		});
	});

	test('returns empty array when no events found', async () => {
		const sourceDatabase = {
			appealEvent: { findMany: mock.fn() }
		};

		sourceDatabase.appealEvent.findMany.mock.mockImplementationOnce(() => []);

		const result = await fetchEventDetails(sourceDatabase, 'CASE-999');

		assert.deepStrictEqual(result, []);
	});
});
