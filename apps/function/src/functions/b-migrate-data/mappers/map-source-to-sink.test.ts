// @ts-nocheck
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mapSourceToSinkAppeal } from './map-source-to-sink.ts';

describe('mapSourceToSinkAppeal', () => {
	test('maps caseReference to reference field', () => {
		const result = mapSourceToSinkAppeal({ caseReference: 'CASE-001' });
		assert.strictEqual(result.reference, 'CASE-001');
	});

	test('includes hearing when hearing event provided', () => {
		const result = mapSourceToSinkAppeal({ caseReference: 'CASE-001' }, [
			{ eventType: 'hearing', eventStartDateTime: '2024-01-15T10:00:00Z' }
		]);

		assert.strictEqual(result.reference, 'CASE-001');
		assert.ok(result.hearing?.create);
		assert.strictEqual(result.inquiry, undefined);
	});

	test('includes inquiry when inquiry event provided', () => {
		const result = mapSourceToSinkAppeal({ caseReference: 'CASE-002' }, [
			{ eventType: 'inquiry', eventStartDateTime: '2024-02-20T09:00:00Z' }
		]);

		assert.strictEqual(result.reference, 'CASE-002');
		assert.ok(result.inquiry?.create);
		assert.strictEqual(result.hearing, undefined);
	});

	test('omits events when no event data provided', () => {
		const result = mapSourceToSinkAppeal({ caseReference: 'CASE-001' });

		assert.strictEqual(result.reference, 'CASE-001');
		assert.strictEqual(result.hearing, undefined);
		assert.strictEqual(result.inquiry, undefined);
	});

	test('processes multiple events of different types', () => {
		const result = mapSourceToSinkAppeal({ caseReference: 'CASE-003' }, [
			{ eventType: 'hearing', eventStartDateTime: '2024-01-15T10:00:00Z' },
			{ eventType: 'inquiry', eventStartDateTime: '2024-02-20T09:00:00Z' },
			{ eventType: 'site_visit_accompanied', eventStartDateTime: '2024-03-10T14:00:00Z' }
		]);

		assert.strictEqual(result.reference, 'CASE-003');
		assert.ok(result.hearing?.create, 'Should have hearing');
		assert.ok(result.inquiry?.create, 'Should have inquiry');
		assert.ok(result.siteVisit?.create, 'Should have site visit');
	});

	test('uses first occurrence when multiple events of same type', () => {
		const result = mapSourceToSinkAppeal({ caseReference: 'CASE-004' }, [
			{ eventType: 'hearing', eventStartDateTime: '2024-01-15T10:00:00Z' },
			{ eventType: 'hearing', eventStartDateTime: '2024-01-20T14:00:00Z' }
		]);

		assert.strictEqual(result.reference, 'CASE-004');
		assert.ok(result.hearing?.create);
		// Verify it's the first hearing (Jan 15, not Jan 20)
		assert.deepStrictEqual(result.hearing.create.hearingStartTime, new Date('2024-01-15T10:00:00Z'));
	});

	test('skips unknown event types and processes valid ones', () => {
		const result = mapSourceToSinkAppeal({ caseReference: 'CASE-005' }, [
			{ eventType: 'in_house', eventStartDateTime: '2024-01-10T09:00:00Z' },
			{ eventType: 'hearing', eventStartDateTime: '2024-01-15T10:00:00Z' }
		]);

		assert.strictEqual(result.reference, 'CASE-005');
		assert.ok(result.hearing?.create, 'Should have hearing');
		assert.strictEqual(result.inquiry, undefined);
		assert.strictEqual(result.siteVisit, undefined);
	});
});
