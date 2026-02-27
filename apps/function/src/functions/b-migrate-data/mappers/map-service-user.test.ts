// @ts-nocheck
import { SERVICE_USER_TYPE } from '@planning-inspectorate/data-model';
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { getServiceUserRole, mapServiceUser, mapServiceUsersToAppealRelations } from './map-service-user.ts';

describe('mapServiceUser', () => {
	test('maps all service user fields correctly', () => {
		const sourceServiceUser = {
			id: '1',
			salutation: 'Mr',
			firstName: 'John',
			lastName: 'Doe',
			addressLine1: '123 Main St',
			addressLine2: 'Apt 4',
			addressTown: 'London',
			addressCounty: 'Greater London',
			postcode: 'SW1A 1AA',
			addressCountry: 'United Kingdom',
			organisation: 'Acme Corp',
			organisationType: 'Limited Company',
			role: 'Director',
			telephoneNumber: '020 1234 5678',
			otherPhoneNumber: '020 8765 4321',
			faxNumber: '020 1111 2222',
			emailAddress: 'john.doe@example.com',
			webAddress: 'https://example.com',
			serviceUserType: SERVICE_USER_TYPE.APPELLANT,
			caseReference: 'CASE-001',
			sourceSuid: 'SUID-001',
			sourceSystem: 'Horizon'
		};

		const result = mapServiceUser(sourceServiceUser);

		assert.strictEqual(result.organisationName, 'Acme Corp');
		assert.strictEqual(result.salutation, 'Mr');
		assert.strictEqual(result.firstName, 'John');
		assert.strictEqual(result.lastName, 'Doe');
		assert.strictEqual(result.email, 'john.doe@example.com');
		assert.strictEqual(result.website, 'https://example.com');
		assert.strictEqual(result.phoneNumber, '020 1234 5678');
		assert.ok(result.address);
		assert.strictEqual(result.address.create.addressLine1, '123 Main St');
		assert.strictEqual(result.address.create.addressLine2, 'Apt 4');
		assert.strictEqual(result.address.create.addressCounty, 'Greater London');
		assert.strictEqual(result.address.create.postcode, 'SW1A 1AA');
		assert.strictEqual(result.address.create.addressCountry, 'United Kingdom');
	});

	test('defaults addressCountry to United Kingdom when null', () => {
		const sourceServiceUser = {
			postcode: 'EC1A 1BB',
			addressCountry: null
		};

		const result = mapServiceUser(sourceServiceUser);

		assert.ok(result.address);
		assert.strictEqual(result.address.create.postcode, 'EC1A 1BB');
		assert.strictEqual(result.address.create.addressCountry, 'United Kingdom');
	});

	test('does not create address when all address fields are null', () => {
		const sourceServiceUser = {
			firstName: 'Jane',
			emailAddress: 'jane@example.com'
		};

		const result = mapServiceUser(sourceServiceUser);

		assert.strictEqual(result.address, undefined);
	});
});

describe('getServiceUserRole', () => {
	test('identifies appellant correctly', () => {
		const result = getServiceUserRole({ serviceUserType: SERVICE_USER_TYPE.APPELLANT });

		assert.strictEqual(result.isAppellant, true);
		assert.strictEqual(result.isAgent, false);
		assert.strictEqual(result.serviceUserType, SERVICE_USER_TYPE.APPELLANT);
	});

	test('applicant is not appellant or agent', () => {
		const result = getServiceUserRole({ serviceUserType: SERVICE_USER_TYPE.APPLICANT });

		assert.strictEqual(result.isAppellant, false);
		assert.strictEqual(result.isAgent, false);
		assert.strictEqual(result.serviceUserType, SERVICE_USER_TYPE.APPLICANT);
	});

	test('identifies agent correctly', () => {
		const result = getServiceUserRole({ serviceUserType: SERVICE_USER_TYPE.AGENT });

		assert.strictEqual(result.isAppellant, false);
		assert.strictEqual(result.isAgent, true);
		assert.strictEqual(result.serviceUserType, SERVICE_USER_TYPE.AGENT);
	});

	test('handles null service user type', () => {
		const result = getServiceUserRole({ serviceUserType: null });

		assert.strictEqual(result.isAppellant, false);
		assert.strictEqual(result.isAgent, false);
		assert.strictEqual(result.serviceUserType, null);
	});

	test('identifies interested party correctly', () => {
		const result = getServiceUserRole({ serviceUserType: SERVICE_USER_TYPE.INTERESTED_PARTY });

		assert.strictEqual(result.isAppellant, false);
		assert.strictEqual(result.isAgent, false);
		assert.strictEqual(result.isInterestedParty, true);
		assert.strictEqual(result.isRule6Party, false);
		assert.strictEqual(result.serviceUserType, SERVICE_USER_TYPE.INTERESTED_PARTY);
	});

	test('identifies rule 6 party correctly', () => {
		const result = getServiceUserRole({ serviceUserType: SERVICE_USER_TYPE.RULE_6_PARTY });

		assert.strictEqual(result.isAppellant, false);
		assert.strictEqual(result.isAgent, false);
		assert.strictEqual(result.isInterestedParty, false);
		assert.strictEqual(result.isRule6Party, true);
		assert.strictEqual(result.serviceUserType, SERVICE_USER_TYPE.RULE_6_PARTY);
	});
});

describe('mapServiceUsersToAppealRelations', () => {
	test('maps appellant and agent from service users array', () => {
		const serviceUsers = [
			{ firstName: 'John', emailAddress: 'appellant@example.com', serviceUserType: SERVICE_USER_TYPE.APPELLANT },
			{ firstName: 'Jane', emailAddress: 'agent@example.com', serviceUserType: SERVICE_USER_TYPE.AGENT }
		];

		const result = mapServiceUsersToAppealRelations(serviceUsers);

		assert.strictEqual(typeof result.appellant, 'object');
		assert.notStrictEqual(result.appellant, null);
		assert.strictEqual(result.appellant.firstName, 'John');
		assert.strictEqual(result.appellant.email, 'appellant@example.com');

		assert.strictEqual(typeof result.agent, 'object');
		assert.notStrictEqual(result.agent, null);
		assert.strictEqual(result.agent.firstName, 'Jane');
		assert.strictEqual(result.agent.email, 'agent@example.com');
	});

	test('handles only appellant present', () => {
		const result = mapServiceUsersToAppealRelations([{ serviceUserType: SERVICE_USER_TYPE.APPELLANT }]);

		assert.strictEqual(typeof result.appellant, 'object');
		assert.notStrictEqual(result.appellant, null);
		assert.strictEqual(result.agent, undefined);
	});

	test('handles only agent present', () => {
		const result = mapServiceUsersToAppealRelations([{ serviceUserType: SERVICE_USER_TYPE.AGENT }]);

		assert.strictEqual(result.appellant, undefined);
		assert.strictEqual(typeof result.agent, 'object');
		assert.notStrictEqual(result.agent, null);
	});

	test('handles empty array', () => {
		const result = mapServiceUsersToAppealRelations([]);

		assert.strictEqual(result.appellant, undefined);
		assert.strictEqual(result.agent, undefined);
	});

	test('throws error when multiple appellants present', () => {
		const serviceUsers = [
			{ firstName: 'First', emailAddress: 'first@example.com', serviceUserType: SERVICE_USER_TYPE.APPELLANT },
			{ firstName: 'Second', emailAddress: 'second@example.com', serviceUserType: SERVICE_USER_TYPE.APPELLANT }
		];

		assert.throws(
			() => {
				mapServiceUsersToAppealRelations(serviceUsers);
			},
			{
				message: /Duplicate appellant found in service users/
			}
		);
	});

	test('throws error when multiple agents present', () => {
		const serviceUsers = [
			{ firstName: 'First', emailAddress: 'first@example.com', serviceUserType: SERVICE_USER_TYPE.AGENT },
			{ firstName: 'Second', emailAddress: 'second@example.com', serviceUserType: SERVICE_USER_TYPE.AGENT }
		];

		assert.throws(
			() => {
				mapServiceUsersToAppealRelations(serviceUsers);
			},
			{
				message: /Duplicate agent found in service users/
			}
		);
	});

	test('throws error for unknown service user types', () => {
		const serviceUsers = [{ serviceUserType: SERVICE_USER_TYPE.APPLICANT }];

		assert.throws(
			() => {
				mapServiceUsersToAppealRelations(serviceUsers);
			},
			{
				message: /Unknown service user type: Applicant/
			}
		);
	});

	test('maps interested party to representation', () => {
		const serviceUsers = [
			{
				firstName: 'Alice',
				emailAddress: 'interested@example.com',
				serviceUserType: SERVICE_USER_TYPE.INTERESTED_PARTY
			}
		];

		const result = mapServiceUsersToAppealRelations(serviceUsers);

		assert.strictEqual(Array.isArray(result.interestedPartyRepresentations), true);
		assert.strictEqual(result.interestedPartyRepresentations.length, 1);
		assert.strictEqual(result.interestedPartyRepresentations[0].representationType, 'comment');
		assert.strictEqual(typeof result.interestedPartyRepresentations[0].represented, 'object');
		assert.notStrictEqual(result.interestedPartyRepresentations[0].represented, null);
		assert.strictEqual(typeof result.interestedPartyRepresentations[0].represented.create, 'object');
		assert.notStrictEqual(result.interestedPartyRepresentations[0].represented.create, null);
		assert.strictEqual(result.interestedPartyRepresentations[0].represented.create.firstName, 'Alice');
		assert.strictEqual(result.interestedPartyRepresentations[0].represented.create.email, 'interested@example.com');
	});

	test('maps rule 6 party to appeal rule 6 party', () => {
		const serviceUsers = [
			{ firstName: 'Bob', emailAddress: 'rule6@example.com', serviceUserType: SERVICE_USER_TYPE.RULE_6_PARTY }
		];

		const result = mapServiceUsersToAppealRelations(serviceUsers);

		assert.strictEqual(Array.isArray(result.rule6Parties), true);
		assert.strictEqual(result.rule6Parties.length, 1);
		assert.strictEqual(typeof result.rule6Parties[0].serviceUser, 'object');
		assert.notStrictEqual(result.rule6Parties[0].serviceUser, null);
		assert.strictEqual(typeof result.rule6Parties[0].serviceUser.create, 'object');
		assert.notStrictEqual(result.rule6Parties[0].serviceUser.create, null);
		assert.strictEqual(result.rule6Parties[0].serviceUser.create.firstName, 'Bob');
		assert.strictEqual(result.rule6Parties[0].serviceUser.create.email, 'rule6@example.com');
	});

	test('maps all service user types together', () => {
		const serviceUsers = [
			{ firstName: 'John', emailAddress: 'appellant@example.com', serviceUserType: SERVICE_USER_TYPE.APPELLANT },
			{ firstName: 'Jane', emailAddress: 'agent@example.com', serviceUserType: SERVICE_USER_TYPE.AGENT },
			{
				firstName: 'Alice',
				emailAddress: 'interested@example.com',
				serviceUserType: SERVICE_USER_TYPE.INTERESTED_PARTY
			},
			{ firstName: 'Bob', emailAddress: 'rule6@example.com', serviceUserType: SERVICE_USER_TYPE.RULE_6_PARTY }
		];

		const result = mapServiceUsersToAppealRelations(serviceUsers);

		assert.strictEqual(typeof result.appellant, 'object');
		assert.notStrictEqual(result.appellant, null);
		assert.strictEqual(result.appellant.firstName, 'John');
		assert.strictEqual(typeof result.agent, 'object');
		assert.notStrictEqual(result.agent, null);
		assert.strictEqual(result.agent.firstName, 'Jane');
		assert.strictEqual(Array.isArray(result.interestedPartyRepresentations), true);
		assert.strictEqual(result.interestedPartyRepresentations.length, 1);
		assert.strictEqual(result.interestedPartyRepresentations[0].represented.create.firstName, 'Alice');
		assert.strictEqual(Array.isArray(result.rule6Parties), true);
		assert.strictEqual(result.rule6Parties.length, 1);
		assert.strictEqual(result.rule6Parties[0].serviceUser.create.firstName, 'Bob');
	});
});
