// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { fetchSinkCaseDetails } from './case-details.ts';

describe('fetchSinkCaseDetails', () => {
	test('returns appeal when found', async () => {
		const sinkDatabase = { appeal: { findUnique: mock.fn() } };
		const mockAppeal = { id: 1, reference: 'CASE-001' };
		sinkDatabase.appeal.findUnique.mock.mockImplementationOnce(() => mockAppeal);

		const result = await fetchSinkCaseDetails(sinkDatabase, 'CASE-001');

		assert.deepStrictEqual(result, mockAppeal);
		assert.deepStrictEqual(sinkDatabase.appeal.findUnique.mock.calls[0].arguments[0].where, {
			reference: 'CASE-001'
		});
		assert.ok(sinkDatabase.appeal.findUnique.mock.calls[0].arguments[0].include);
	});

	test('returns null when appeal not found', async () => {
		const sinkDatabase = { appeal: { findUnique: mock.fn() } };
		sinkDatabase.appeal.findUnique.mock.mockImplementationOnce(() => null);

		const result = await fetchSinkCaseDetails(sinkDatabase, 'CASE-999');

		assert.strictEqual(result, null);
	});
});
