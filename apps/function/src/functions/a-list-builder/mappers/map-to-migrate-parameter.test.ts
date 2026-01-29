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
});
