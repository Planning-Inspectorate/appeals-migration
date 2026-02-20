// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { mapEventToHearing, mapEventToInquiry, mapEventToSink, mapEventToSiteVisit } from './map-event-to-sink.ts';

describe('mapEventToHearing', () => {
	test('maps event with all fields including address', () => {
		const event = {
			eventStartDateTime: '2024-01-15T10:00:00Z',
			eventEndDateTime: '2024-01-15T16:00:00Z',
			addressLine1: '123 Main St',
			addressTown: 'London',
			addressPostcode: 'SW1A 1AA'
		};

		const result = mapEventToHearing(event);

		assert.ok(result);
		assert.deepStrictEqual(result.hearingStartTime, new Date('2024-01-15T10:00:00Z'));
		assert.deepStrictEqual(result.hearingEndTime, new Date('2024-01-15T16:00:00Z'));
		assert.ok(result.address?.create);
		assert.strictEqual(result.address.create.addressLine1, '123 Main St');
	});

	test('returns null when start time is missing', () => {
		const result = mapEventToHearing({ eventStartDateTime: null });
		assert.strictEqual(result, null);
	});

	test('omits address when all address fields are null', () => {
		const result = mapEventToHearing({ eventStartDateTime: '2024-01-15T10:00:00Z' });
		assert.strictEqual(result.address, undefined);
	});
});

describe('mapEventToInquiry', () => {
	test('maps event with all fields including address', () => {
		const event = {
			eventStartDateTime: '2024-02-20T09:00:00Z',
			eventEndDateTime: '2024-02-22T17:00:00Z',
			addressLine1: '456 Court Rd',
			addressPostcode: 'M1 1AA'
		};

		const result = mapEventToInquiry(event);

		assert.ok(result);
		assert.deepStrictEqual(result.inquiryStartTime, new Date('2024-02-20T09:00:00Z'));
		assert.deepStrictEqual(result.inquiryEndTime, new Date('2024-02-22T17:00:00Z'));
		assert.ok(result.address?.create);
		assert.strictEqual(result.address.create.addressLine1, '456 Court Rd');
	});

	test('returns null when start time is missing', () => {
		const result = mapEventToInquiry({ eventStartDateTime: null });
		assert.strictEqual(result, null);
	});
});

describe('mapEventToSiteVisit', () => {
	test('maps event with start and end times', () => {
		const event = {
			eventStartDateTime: '2024-03-10T14:00:00Z',
			eventEndDateTime: '2024-03-10T15:00:00Z'
		};

		const result = mapEventToSiteVisit(event);

		assert.ok(result);
		assert.deepStrictEqual(result.visitDate, new Date('2024-03-10T14:00:00Z'));
		assert.deepStrictEqual(result.visitStartTime, new Date('2024-03-10T14:00:00Z'));
		assert.deepStrictEqual(result.visitEndTime, new Date('2024-03-10T15:00:00Z'));
	});

	test('connects to siteVisitType by key when eventType is provided', () => {
		const event = {
			eventType: 'site_visit_accompanied',
			eventStartDateTime: '2024-03-10T14:00:00Z'
		};

		const result = mapEventToSiteVisit(event);

		assert.ok(result);
		assert.ok(result.siteVisitType?.connect);
		assert.strictEqual(result.siteVisitType.connect.key, 'site_visit_accompanied');
	});

	test('omits siteVisitType when eventType is null', () => {
		const event = {
			eventType: null,
			eventStartDateTime: '2024-03-10T14:00:00Z'
		};

		const result = mapEventToSiteVisit(event);

		assert.ok(result);
		assert.strictEqual(result.siteVisitType, undefined);
	});

	test('returns null when start time is missing', () => {
		const result = mapEventToSiteVisit({ eventStartDateTime: null });
		assert.strictEqual(result, null);
	});
});

describe('mapEventToSink', () => {
	test('creates hearing for hearing event type', () => {
		const result = mapEventToSink({
			eventType: 'hearing',
			eventStartDateTime: '2024-01-15T10:00:00Z'
		});

		assert.ok(result.hearing?.create);
		assert.strictEqual(result.inquiry, undefined);
	});

	test('creates hearing for hearing_virtual event type', () => {
		const result = mapEventToSink({
			eventType: 'hearing_virtual',
			eventStartDateTime: '2024-01-15T10:00:00Z'
		});

		assert.ok(result.hearing?.create);
		assert.strictEqual(result.inquiry, undefined);
	});

	test('creates inquiry for inquiry event type', () => {
		const result = mapEventToSink({
			eventType: 'inquiry',
			eventStartDateTime: '2024-02-20T09:00:00Z'
		});

		assert.ok(result.inquiry?.create);
		assert.strictEqual(result.hearing, undefined);
	});

	test('creates inquiry for inquiry_virtual event type', () => {
		const result = mapEventToSink({
			eventType: 'inquiry_virtual',
			eventStartDateTime: '2024-02-20T09:00:00Z'
		});

		assert.ok(result.inquiry?.create);
		assert.strictEqual(result.hearing, undefined);
	});

	test('creates inquiry for pre_inquiry event type', () => {
		const result = mapEventToSink({
			eventType: 'pre_inquiry',
			eventStartDateTime: '2024-02-20T09:00:00Z'
		});

		assert.ok(result.inquiry?.create);
		assert.strictEqual(result.hearing, undefined);
	});

	test('returns empty object when start time is missing', () => {
		const result = mapEventToSink({
			eventType: 'hearing',
			eventStartDateTime: null
		});

		assert.deepStrictEqual(result, {});
	});

	test('creates site visit for site_visit_accompanied event type', () => {
		const result = mapEventToSink({
			eventType: 'site_visit_accompanied',
			eventStartDateTime: '2024-03-01T10:00:00Z'
		});

		assert.ok(result.siteVisit?.create);
		assert.strictEqual(result.hearing, undefined);
		assert.strictEqual(result.inquiry, undefined);
	});

	test('creates site visit for site_visit_access_required event type', () => {
		const result = mapEventToSink({
			eventType: 'site_visit_access_required',
			eventStartDateTime: '2024-03-01T10:00:00Z'
		});

		assert.ok(result.siteVisit?.create);
	});

	test('throws error for in_house event type', () => {
		assert.throws(
			() => {
				mapEventToSink({
					eventType: 'in_house',
					eventStartDateTime: '2024-03-01T10:00:00Z'
				});
			},
			{
				message: /Unknown event type: in_house/
			}
		);
	});

	test('throws error for unmapped event types', () => {
		assert.throws(
			() => {
				mapEventToSink({
					eventType: 'unknown_event_type',
					eventStartDateTime: '2024-03-01T10:00:00Z'
				});
			},
			{
				message: /Unknown event type: unknown_event_type/
			}
		);
	});
});
