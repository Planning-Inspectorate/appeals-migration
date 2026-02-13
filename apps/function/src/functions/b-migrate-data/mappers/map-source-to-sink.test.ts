// @ts-nocheck
import { describe, test } from 'node:test';
import assert from 'node:assert';
import { SERVICE_USER_TYPE } from '@planning-inspectorate/data-model';
import { mapSourceToSinkAppeal } from './map-source-to-sink.ts';

describe('mapSourceToSinkAppeal', () => {
	test('maps caseReference to reference field', () => {
		const sourceCase = {
			caseId: 1,
			caseReference: 'CASE-001',
			caseStatus: 'open'
		};

		const result = mapSourceToSinkAppeal(sourceCase);

		assert.strictEqual(result.reference, 'CASE-001');
		assert.strictEqual(result.appellant, undefined);
		assert.strictEqual(result.agent, undefined);
	});

	test('handles null caseReference', () => {
		const caseWithNullRef = {
			caseId: 3,
			caseReference: null
		};

		const result = mapSourceToSinkAppeal(caseWithNullRef);

		assert.strictEqual(result.reference, null);
	});

	test('maps appellant from service users', () => {
		const sourceCase = {
			caseId: 1,
			caseReference: 'CASE-001',
			caseStatus: 'open'
		};

		const serviceUsers = [
			{
				id: '1',
				firstName: 'John',
				lastName: 'Appellant',
				emailAddress: 'appellant@example.com',
				serviceUserType: SERVICE_USER_TYPE.APPELLANT,
				caseReference: 'CASE-001',
				addressLine1: '123 Main St',
				postcode: 'SW1A 1AA'
			}
		];

		const result = mapSourceToSinkAppeal(sourceCase, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-001');
		assert.ok(result.appellant);
		assert.ok(result.appellant.create);
		assert.strictEqual(result.appellant.create.firstName, 'John');
		assert.strictEqual(result.appellant.create.lastName, 'Appellant');
		assert.strictEqual(result.appellant.create.email, 'appellant@example.com');
		assert.ok(result.appellant.create.address);
	});

	test('maps agent from service users', () => {
		const sourceCase = {
			caseId: 2,
			caseReference: 'CASE-002',
			caseStatus: 'open'
		};

		const serviceUsers = [
			{
				id: '2',
				firstName: 'Jane',
				lastName: 'Agent',
				emailAddress: 'agent@example.com',
				serviceUserType: SERVICE_USER_TYPE.AGENT,
				caseReference: 'CASE-002',
				telephoneNumber: '020 1234 5678'
			}
		];

		const result = mapSourceToSinkAppeal(sourceCase, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-002');
		assert.ok(result.agent);
		assert.ok(result.agent.create);
		assert.strictEqual(result.agent.create.firstName, 'Jane');
		assert.strictEqual(result.agent.create.lastName, 'Agent');
		assert.strictEqual(result.agent.create.email, 'agent@example.com');
		assert.strictEqual(result.agent.create.phoneNumber, '020 1234 5678');
	});

	test('maps both appellant and agent from service users', () => {
		const sourceCase = {
			caseId: 3,
			caseReference: 'CASE-003',
			caseStatus: 'open'
		};

		const serviceUsers = [
			{
				id: '1',
				firstName: 'John',
				lastName: 'Appellant',
				emailAddress: 'appellant@example.com',
				serviceUserType: SERVICE_USER_TYPE.APPELLANT,
				caseReference: 'CASE-003'
			},
			{
				id: '2',
				firstName: 'Jane',
				lastName: 'Agent',
				emailAddress: 'agent@example.com',
				serviceUserType: SERVICE_USER_TYPE.AGENT,
				caseReference: 'CASE-003'
			}
		];

		const result = mapSourceToSinkAppeal(sourceCase, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-003');
		assert.ok(result.appellant);
		assert.strictEqual(result.appellant.create.firstName, 'John');
		assert.ok(result.agent);
		assert.strictEqual(result.agent.create.firstName, 'Jane');
	});

	test('handles empty service users array', () => {
		const sourceCase = {
			caseId: 4,
			caseReference: 'CASE-004',
			caseStatus: 'open'
		};

		const result = mapSourceToSinkAppeal(sourceCase, []);

		assert.strictEqual(result.reference, 'CASE-004');
		assert.strictEqual(result.appellant, undefined);
		assert.strictEqual(result.agent, undefined);
	});

	test('handles service users with no appellant or agent types', () => {
		const sourceCase = {
			caseId: 5,
			caseReference: 'CASE-005',
			caseStatus: 'open'
		};

		const serviceUsers = [
			{
				id: '1',
				firstName: 'Interested',
				lastName: 'Party',
				emailAddress: 'interested@example.com',
				serviceUserType: SERVICE_USER_TYPE.INTERESTED_PARTY,
				caseReference: 'CASE-005'
			}
		];

		const result = mapSourceToSinkAppeal(sourceCase, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-005');
		assert.strictEqual(result.appellant, undefined);
		assert.strictEqual(result.agent, undefined);
	});
});
