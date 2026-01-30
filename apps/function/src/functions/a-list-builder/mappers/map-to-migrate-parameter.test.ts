// @ts-nocheck
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mapToMigrateParameterToWhere } from './map-to-migrate-parameter.ts';

describe('mapToMigrateParameterToWhere', () => {
	test('returns {} when no usable filters are provided', () => {
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: null, procedureType: null }), {});
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: '', procedureType: '' }), {});
	});

	test('maps each field when provided', () => {
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: 'open', procedureType: null }), {
			caseStatus: 'open'
		});

		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: null, procedureType: 'written' }), {
			caseProcedure: 'written'
		});
	});

	test('maps both status and procedureType when both are provided', () => {
		assert.deepStrictEqual(mapToMigrateParameterToWhere({ id: 1, status: 'open', procedureType: 'written' }), {
			caseStatus: 'open',
			caseProcedure: 'written'
		});
	});
});
