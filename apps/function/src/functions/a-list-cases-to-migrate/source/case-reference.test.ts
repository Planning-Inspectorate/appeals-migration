// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { fetchCaseReferences } from './case-reference.ts';

describe('fetchCaseReferences', () => {
	const newSourceDatabase = () => ({
		appealHas: { findMany: mock.fn() },
		appealS78: { findMany: mock.fn() }
	});

	test('combines, filters invalid refs, and deduplicates (preserving first-seen order)', async () => {
		const sourceDatabase = newSourceDatabase();

		sourceDatabase.appealHas.findMany.mock.mockImplementationOnce(() => [
			{ caseReference: 'CASE-001' },
			{ caseReference: null },
			{ caseReference: 'CASE-002' },
			{ caseReference: 'CASE-001' }, // dup within HAS
			{ caseReference: '' }
		]);

		sourceDatabase.appealS78.findMany.mock.mockImplementationOnce(() => [
			{ caseReference: undefined },
			{ caseReference: 'CASE-002' }, // dup across tables
			{ caseReference: 'CASE-003' }
		]);

		const result = await fetchCaseReferences(sourceDatabase, {}, {});
		assert.deepStrictEqual(result, ['CASE-001', 'CASE-002', 'CASE-003']);
	});

	test('passes where clauses and select to both queries', async () => {
		const sourceDatabase = newSourceDatabase();

		sourceDatabase.appealHas.findMany.mock.mockImplementationOnce(() => [{ caseReference: 'CASE-001' }]);
		sourceDatabase.appealS78.findMany.mock.mockImplementationOnce(() => [{ caseReference: 'CASE-002' }]);

		const hasWhere = { caseStatus: 'open', caseSubmittedDate: { gte: new Date('2025-01-01') } };
		const s78Where = { caseStatus: 'closed', caseSubmittedDate: { lte: new Date('2025-12-31') } };

		await fetchCaseReferences(sourceDatabase, hasWhere, s78Where);

		assert.deepStrictEqual(sourceDatabase.appealHas.findMany.mock.calls[0].arguments[0], {
			where: hasWhere,
			select: { caseReference: true }
		});

		assert.deepStrictEqual(sourceDatabase.appealS78.findMany.mock.calls[0].arguments[0], {
			where: s78Where,
			select: { caseReference: true }
		});
	});

	test('returns [] when no rows are returned', async () => {
		const sourceDatabase = newSourceDatabase();

		sourceDatabase.appealHas.findMany.mock.mockImplementationOnce(() => []);
		sourceDatabase.appealS78.findMany.mock.mockImplementationOnce(() => []);

		const result = await fetchCaseReferences(sourceDatabase, {}, {});
		assert.deepStrictEqual(result, []);
	});
});
