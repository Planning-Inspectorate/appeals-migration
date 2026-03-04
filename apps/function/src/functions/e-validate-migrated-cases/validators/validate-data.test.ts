// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { validateData } from './validate-data.ts';

const baseSource = {
	caseReference: 'CASE-001',
	submissionId: null,
	applicationReference: 'APP-REF-001',
	caseCreatedDate: '2024-01-10T09:00:00.000Z',
	caseUpdatedDate: '2024-01-20T14:30:00.000Z',
	caseValidDate: '2024-01-22T09:00:00.000Z',
	caseExtensionDate: null,
	caseStartedDate: '2024-01-25T11:00:00.000Z',
	casePublishedDate: '2024-01-28T16:00:00.000Z'
};

const baseSink = {
	reference: 'CASE-001',
	submissionId: null,
	applicationReference: 'APP-REF-001',
	caseCreatedDate: new Date('2024-01-10T09:00:00.000Z'),
	caseUpdatedDate: new Date('2024-01-20T14:30:00.000Z'),
	caseValidDate: new Date('2024-01-22T09:00:00.000Z'),
	caseExtensionDate: null,
	caseStartedDate: new Date('2024-01-25T11:00:00.000Z'),
	casePublishedDate: new Date('2024-01-28T16:00:00.000Z')
};

describe('validateData', () => {
	test('returns true for matching HAS and S78 cases', () => {
		assert.strictEqual(validateData({ type: 'has', data: { ...baseSource } }, baseSink), true);
		assert.strictEqual(validateData({ type: 's78', data: { ...baseSource } }, baseSink), true);
	});

	test('returns false when any field mismatches', () => {
		const mismatchTests = [
			{ source: { ...baseSource, caseReference: 'WRONG' }, sink: { ...baseSink, reference: 'CASE-001' } },
			{
				source: { ...baseSource, applicationReference: 'WRONG' },
				sink: { ...baseSink, applicationReference: 'APP-REF-001' }
			},
			{
				source: { ...baseSource, caseCreatedDate: '2024-02-01T00:00:00.000Z' },
				sink: { ...baseSink, caseCreatedDate: new Date('2024-01-10T09:00:00.000Z') }
			},
			{
				source: { ...baseSource, caseExtensionDate: '2024-05-15T10:00:00.000Z' },
				sink: { ...baseSink, caseExtensionDate: null }
			}
		];

		for (const { source, sink } of mismatchTests) {
			assert.strictEqual(validateData({ type: 'has', data: source }, sink), false);
		}
	});

	test('handles null equivalence correctly', () => {
		const nullSource = { ...baseSource, submissionId: null, caseCreatedDate: null };
		const nullSink = { ...baseSink, submissionId: null, caseCreatedDate: null };
		assert.strictEqual(validateData({ type: 'has', data: nullSource }, nullSink), true);

		const mismatchedNull = { ...baseSink, submissionId: 'SUB-123' };
		assert.strictEqual(
			validateData({ type: 'has', data: { ...baseSource, submissionId: null } }, mismatchedNull),
			false
		);
	});

	test('handles date mapping correctly', () => {
		const sourceWithDate = { ...baseSource, caseExtensionDate: '2024-05-15T10:00:00.000Z' };
		const sinkWithDate = { ...baseSink, caseExtensionDate: new Date('2024-05-15T10:00:00.000Z') };
		assert.strictEqual(validateData({ type: 'has', data: sourceWithDate }, sinkWithDate), true);

		const sourceNull = { ...baseSource, caseExtensionDate: null };
		const sinkNull = { ...baseSink, caseExtensionDate: null };
		assert.strictEqual(validateData({ type: 'has', data: sourceNull }, sinkNull), true);
	});
});
