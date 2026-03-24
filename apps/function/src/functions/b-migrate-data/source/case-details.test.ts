// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { fetchCaseDetails } from './case-details.ts';

describe('fetchCaseDetails', () => {
	test('returns has case when found in AppealHas', async () => {
		const sourceDatabase = {
			appealHas: { findFirst: mock.fn() },
			appealS78: { findFirst: mock.fn() }
		};

		const mockHasCase = { caseId: 1, caseReference: 'CASE-001' };
		sourceDatabase.appealHas.findFirst.mock.mockImplementationOnce(() => mockHasCase);

		const result = await fetchCaseDetails(sourceDatabase, 'CASE-001');

		assert.deepStrictEqual(result, { type: 'has', data: mockHasCase });
	});

	test('returns s78 case when not found in AppealHas but found in AppealS78', async () => {
		const sourceDatabase = {
			appealHas: { findFirst: mock.fn() },
			appealS78: { findFirst: mock.fn() }
		};

		const mockS78Case = { caseId: 2, caseReference: 'CASE-002' };
		sourceDatabase.appealHas.findFirst.mock.mockImplementationOnce(() => null);
		sourceDatabase.appealS78.findFirst.mock.mockImplementationOnce(() => mockS78Case);

		const result = await fetchCaseDetails(sourceDatabase, 'CASE-002');

		assert.deepStrictEqual(result, { type: 's78', data: mockS78Case });
	});

	test('returns null when case not found in either table', async () => {
		const sourceDatabase = {
			appealHas: { findFirst: mock.fn() },
			appealS78: { findFirst: mock.fn() }
		};

		sourceDatabase.appealHas.findFirst.mock.mockImplementationOnce(() => null);
		sourceDatabase.appealS78.findFirst.mock.mockImplementationOnce(() => null);

		const result = await fetchCaseDetails(sourceDatabase, 'CASE-999');

		assert.strictEqual(result, null);
	});
});
