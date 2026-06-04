// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { mapToMigrateParameterToWhere } from './map-to-migrate-parameter.ts';

describe('mapToMigrateParameterToWhere', () => {
	const defaultWhere = {
		caseReference: { not: { startsWith: '6' } },
		lpaCode: { notIn: ['X6666', 'Q9999'] }
	};
	test('always includes caseReference filter to exclude Manage Appeals cases', () => {
		let where = mapToMigrateParameterToWhere({ id: 1, status: null, procedureType: null });
		assert.deepStrictEqual(where.caseReference, {
			not: {
				startsWith: '6'
			}
		});
		where = mapToMigrateParameterToWhere({ id: 1, status: '', procedureType: '' });
		assert.deepStrictEqual(where.caseReference, {
			not: {
				startsWith: '6'
			}
		});
	});
	test('always includes LPA filter to exclude test cases', () => {
		let where = mapToMigrateParameterToWhere({ id: 1, status: null, procedureType: null });
		assert.deepStrictEqual(where.lpaCode, {
			notIn: ['X6666', 'Q9999']
		});
		where = mapToMigrateParameterToWhere({ id: 1, status: '', procedureType: '' });
		assert.deepStrictEqual(where.lpaCode, {
			notIn: ['X6666', 'Q9999']
		});
	});

	test('maps each field when provided', () => {
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: 'open', procedureType: null }), {
			caseStatus: 'open',
			...defaultWhere
		});

		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: null, procedureType: 'written' }), {
			caseProcedure: 'written',
			...defaultWhere
		});

		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: null, procedureType: null, lpa: 'ABC' }), {
			...defaultWhere,
			lpaCode: 'ABC'
		});
	});

	test('maps status, procedureType and lpa when all are provided', () => {
		assert.deepStrictEqual(
			mapToMigrateParameterToWhere({ id: 1, status: 'open', procedureType: 'written', lpa: 'ABC' }),
			{
				...defaultWhere,
				caseStatus: 'open',
				caseProcedure: 'written',
				lpaCode: 'ABC'
			}
		);
	});

	test('maps dateReceivedFrom to caseSubmittedDate gte', () => {
		const dateFrom = new Date('2024-01-01T00:00:00.000Z');
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, dateReceivedFrom: dateFrom }), {
			caseSubmittedDate: { gte: '2024-01-01T00:00:00.000Z' },
			...defaultWhere
		});
	});

	test('maps dateReceivedTo to caseSubmittedDate lte', () => {
		const dateTo = new Date('2024-12-31T23:59:59.999Z');
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, dateReceivedTo: dateTo }), {
			caseSubmittedDate: { lte: '2024-12-31T23:59:59.999Z' },
			...defaultWhere
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
				},
				...defaultWhere
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
				},
				...defaultWhere
			}
		);
	});

	test('maps decisionDateFrom to caseDecisionOutcomeDate gte', () => {
		const dateFrom = new Date('2024-01-01T00:00:00.000Z');
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, decisionDateFrom: dateFrom }), {
			caseDecisionOutcomeDate: { gte: '2024-01-01T00:00:00.000Z' },
			...defaultWhere
		});
	});

	test('maps decisionDateTo to caseDecisionOutcomeDate lte', () => {
		const dateTo = new Date('2024-12-31T23:59:59.999Z');
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, decisionDateTo: dateTo }), {
			caseDecisionOutcomeDate: { lte: '2024-12-31T23:59:59.999Z' },
			...defaultWhere
		});
	});

	test('maps both decisionDateFrom and decisionDateTo to caseDecisionOutcomeDate range', () => {
		const dateFrom = new Date('2024-01-01T00:00:00.000Z');
		const dateTo = new Date('2024-12-31T23:59:59.999Z');
		assert.deepStrictEqual(
			mapToMigrateParameterToWhere({ id: 1, decisionDateFrom: dateFrom, decisionDateTo: dateTo }),
			{
				caseDecisionOutcomeDate: {
					gte: '2024-01-01T00:00:00.000Z',
					lte: '2024-12-31T23:59:59.999Z'
				},
				...defaultWhere
			}
		);
	});

	test('combines multiple date ranges and status filters', () => {
		const receivedFrom = new Date('2024-01-01T00:00:00.000Z');
		const receivedTo = new Date('2024-06-30T23:59:59.999Z');
		const decisionFrom = new Date('2024-07-01T00:00:00.000Z');
		const decisionTo = new Date('2024-12-31T23:59:59.999Z');
		assert.deepStrictEqual(
			mapToMigrateParameterToWhere({
				id: 1,
				status: 'closed',
				dateReceivedFrom: receivedFrom,
				dateReceivedTo: receivedTo,
				decisionDateFrom: decisionFrom,
				decisionDateTo: decisionTo
			}),
			{
				caseStatus: 'closed',
				caseSubmittedDate: {
					gte: '2024-01-01T00:00:00.000Z',
					lte: '2024-06-30T23:59:59.999Z'
				},
				caseDecisionOutcomeDate: {
					gte: '2024-07-01T00:00:00.000Z',
					lte: '2024-12-31T23:59:59.999Z'
				},
				...defaultWhere
			}
		);
	});
});
