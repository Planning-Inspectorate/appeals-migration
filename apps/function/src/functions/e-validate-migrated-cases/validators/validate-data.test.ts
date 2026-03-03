// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { validateData } from './validate-data.ts';

describe('validateData', () => {
	test('returns false (stub implementation)', () => {
		const sourceCase = { type: 'has', data: { caseReference: 'CASE-001' } };
		const sinkCase = { reference: 'CASE-001' };

		const result = validateData(sourceCase, sinkCase);

		assert.strictEqual(result, false);
	});
});
