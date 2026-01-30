// @ts-nocheck
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mapToMigrateParameterToWhere } from './map-to-migrate-parameter.ts';

describe('mapToMigrateParameterToWhere', () => {
	test('returns empty object when status is null or empty', () => {
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: null }), {});
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: '' }), {});
	});

	test('maps status to caseStatus for both AppealHas and AppealS78', () => {
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: 'open' }), { caseStatus: 'open' });
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 2, status: 'closed' }), { caseStatus: 'closed' });
	});

	test('maps dateReceivedFrom to caseSubmittedDate gte', () => {
		const dateFrom = new Date('2024-01-01T00:00:00.000Z');
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, dateReceivedFrom: dateFrom }), {
			caseSubmittedDate: { gte: '2024-01-01T00:00:00.000Z' }
		});
	});

	test('maps dateReceivedTo to caseSubmittedDate lte', () => {
		const dateTo = new Date('2024-12-31T23:59:59.999Z');
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, dateReceivedTo: dateTo }), {
			caseSubmittedDate: { lte: '2024-12-31T23:59:59.999Z' }
		});
	});

	test('maps both dateReceivedFrom and dateReceivedTo to caseSubmittedDate range', () => {
		const dateFrom = new Date('2024-01-01T00:00:00.000Z');
		const dateTo = new Date('2024-12-31T23:59:59.999Z');
		assert.deepStrictEqual(
			mapToMigrateParameterToWhere({ id: 1, dateReceivedFrom: dateFrom, dateReceivedTo: dateTo }),
			{
				caseSubmittedDate: {
					gte: '2024-01-01T00:00:00.000Z',
					lte: '2024-12-31T23:59:59.999Z'
				}
			}
		);
	});

	test('combines status and date range filters', () => {
		const dateFrom = new Date('2024-01-01T00:00:00.000Z');
		const dateTo = new Date('2024-12-31T23:59:59.999Z');
		assert.deepStrictEqual(
			mapToMigrateParameterToWhere({
				id: 1,
				status: 'open',
				dateReceivedFrom: dateFrom,
				dateReceivedTo: dateTo
			}),
			{
				caseStatus: 'open',
				caseSubmittedDate: {
					gte: '2024-01-01T00:00:00.000Z',
					lte: '2024-12-31T23:59:59.999Z'
				}
			}
		);
	});
});
