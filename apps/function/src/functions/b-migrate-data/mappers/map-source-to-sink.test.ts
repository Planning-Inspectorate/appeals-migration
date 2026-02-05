// @ts-nocheck
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mapSourceToSinkAppeal } from './map-source-to-sink.ts';

describe('mapSourceToSinkAppeal', () => {
	test('maps caseReference to reference field', () => {
		const sourceCase = {
			caseId: 1,
			caseReference: 'CASE-001',
			caseStatus: 'open'
		};

		const result = mapSourceToSinkAppeal(sourceCase);

		assert.deepStrictEqual(result, { reference: 'CASE-001' });
	});

	test('handles null caseReference', () => {
		const caseWithNullRef = {
			caseId: 3,
			caseReference: null
		};

		const result = mapSourceToSinkAppeal(caseWithNullRef);

		assert.deepStrictEqual(result, { reference: null });
	});
});
