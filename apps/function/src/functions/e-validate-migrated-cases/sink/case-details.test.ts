// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { createSinkDatabaseMock } from '../mock-data/database.ts';
import { fetchSinkCaseDetails } from './case-details.ts';

describe('fetchSinkCaseDetails', () => {
	test('returns appeal when found', async () => {
		const sinkDatabase = createSinkDatabaseMock();
		const mockAppeal = { id: 1, reference: 'CASE-001' };
		sinkDatabase.appeal.findUnique.mock.mockImplementationOnce(async () => mockAppeal);

		const result = await fetchSinkCaseDetails(sinkDatabase, 'CASE-001');

		assert.deepStrictEqual(result, mockAppeal);
		assert.deepStrictEqual(sinkDatabase.appeal.findUnique.mock.calls[0].arguments[0].where, {
			reference: 'CASE-001'
		});
		assert.deepStrictEqual(sinkDatabase.appeal.findUnique.mock.calls[0].arguments[0].include, {
			appealTimetable: true,
			allocation: true,
			appealStatus: true,
			specialisms: { include: { specialism: true } },
			address: true,
			inspectorDecision: true,
			appellantCase: true,
			childAppeals: true,
			neighbouringSites: { include: { address: true } },
			lpaQuestionnaire: {
				include: {
					lpaNotificationMethods: { include: { lpaNotificationMethod: true } },
					listedBuildingDetails: true,
					designatedSiteNames: { include: { designatedSite: true } }
				}
			},
			representations: true,
			appealGrounds: { include: { ground: true } },
			hearing: { include: { address: true } },
			inquiry: { include: { address: true } },
			siteVisit: true,
			appellant: { include: { address: true } },
			agent: { include: { address: true } }
		});
	});

	test('returns null when appeal not found', async () => {
		const sinkDatabase = createSinkDatabaseMock();
		sinkDatabase.appeal.findUnique.mock.mockImplementationOnce(async () => null);

		const result = await fetchSinkCaseDetails(sinkDatabase, 'CASE-999');

		assert.strictEqual(result, null);
	});
});
