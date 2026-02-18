// @ts-nocheck
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { SERVICE_USER_TYPE } from '@planning-inspectorate/data-model';
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

	test('throws error when multiple events of same type', () => {
		assert.throws(
			() => {
				mapSourceToSinkAppeal({ caseReference: 'CASE-004' }, [
					{ eventType: 'hearing', eventStartDateTime: '2024-01-15T10:00:00Z' },
					{ eventType: 'hearing', eventStartDateTime: '2024-01-20T14:00:00Z' }
				]);
			},
			{
				message: /Duplicate hearing event found for case CASE-004/
			}
		);
	});

	test('throws error for unknown event types', () => {
		assert.throws(
			() => {
				mapSourceToSinkAppeal({ caseReference: 'CASE-005' }, [
					{ eventType: 'in_house', eventStartDateTime: '2024-01-10T09:00:00Z' }
				]);
			},
			{
				message: /Unknown event type: in_house/
			}
		);
	});

	test('maps appellant from service users', () => {
		const sourceCase = { caseReference: 'CASE-006' };
		const serviceUsers = [
			{
				id: '1',
				firstName: 'John',
				lastName: 'Appellant',
				emailAddress: 'appellant@example.com',
				serviceUserType: SERVICE_USER_TYPE.APPELLANT,
				caseReference: 'CASE-006',
				addressLine1: '123 Main St',
				postcode: 'SW1A 1AA'
			}
		];

		const result = mapSourceToSinkAppeal(sourceCase, undefined, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-006');
		assert.ok(result.appellant);
		assert.ok(result.appellant.create);
		assert.strictEqual(result.appellant.create.firstName, 'John');
		assert.strictEqual(result.appellant.create.lastName, 'Appellant');
		assert.strictEqual(result.appellant.create.email, 'appellant@example.com');
		assert.ok(result.appellant.create.address);
	});

	test('maps agent from service users', () => {
		const sourceCase = { caseReference: 'CASE-007' };
		const serviceUsers = [
			{
				id: '2',
				firstName: 'Jane',
				lastName: 'Agent',
				emailAddress: 'agent@example.com',
				serviceUserType: SERVICE_USER_TYPE.AGENT,
				caseReference: 'CASE-007',
				telephoneNumber: '020 1234 5678'
			}
		];

		const result = mapSourceToSinkAppeal(sourceCase, undefined, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-007');
		assert.ok(result.agent);
		assert.ok(result.agent.create);
		assert.strictEqual(result.agent.create.firstName, 'Jane');
		assert.strictEqual(result.agent.create.lastName, 'Agent');
		assert.strictEqual(result.agent.create.email, 'agent@example.com');
		assert.strictEqual(result.agent.create.phoneNumber, '020 1234 5678');
	});

	test('maps both events and service users', () => {
		const sourceCase = { caseReference: 'CASE-008' };
		const events = [{ eventType: 'hearing', eventStartDateTime: '2024-01-15T10:00:00Z' }];
		const serviceUsers = [
			{
				id: '1',
				firstName: 'John',
				lastName: 'Appellant',
				emailAddress: 'appellant@example.com',
				serviceUserType: SERVICE_USER_TYPE.APPELLANT,
				caseReference: 'CASE-008'
			}
		];

		const result = mapSourceToSinkAppeal(sourceCase, events, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-008');
		assert.ok(result.hearing?.create);
		assert.ok(result.appellant?.create);
		assert.strictEqual(result.appellant.create.firstName, 'John');
	});

	test('handles empty service users array', () => {
		const result = mapSourceToSinkAppeal({ caseReference: 'CASE-009' }, undefined, []);

		assert.strictEqual(result.reference, 'CASE-009');
		assert.strictEqual(result.appellant, undefined);
		assert.strictEqual(result.agent, undefined);
	});

	test('throws error when duplicate appellants found in service users', () => {
		const serviceUsers = [
			{
				id: '1',
				firstName: 'First',
				lastName: 'Appellant',
				emailAddress: 'first@example.com',
				serviceUserType: SERVICE_USER_TYPE.APPELLANT,
				caseReference: 'CASE-010'
			},
			{
				id: '2',
				firstName: 'Second',
				lastName: 'Appellant',
				emailAddress: 'second@example.com',
				serviceUserType: SERVICE_USER_TYPE.APPELLANT,
				caseReference: 'CASE-010'
			}
		];

		assert.throws(
			() => {
				mapSourceToSinkAppeal({ caseReference: 'CASE-010' }, undefined, serviceUsers);
			},
			{
				message: /Duplicate appellant found in service users/
			}
		);
	});

	test('throws error when duplicate agents found in service users', () => {
		const serviceUsers = [
			{
				id: '1',
				firstName: 'First',
				lastName: 'Agent',
				emailAddress: 'first@example.com',
				serviceUserType: SERVICE_USER_TYPE.AGENT,
				caseReference: 'CASE-011'
			},
			{
				id: '2',
				firstName: 'Second',
				lastName: 'Agent',
				emailAddress: 'second@example.com',
				serviceUserType: SERVICE_USER_TYPE.AGENT,
				caseReference: 'CASE-011'
			}
		];

		assert.throws(
			() => {
				mapSourceToSinkAppeal({ caseReference: 'CASE-011' }, undefined, serviceUsers);
			},
			{
				message: /Duplicate agent found in service users/
			}
		);
	});
});
