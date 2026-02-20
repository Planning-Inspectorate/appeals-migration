import type { AppealServiceUser } from '@pins/odw-curated-database/src/client/client.ts';
import { SERVICE_USER_TYPE } from '@planning-inspectorate/data-model';

export const mockAppellantServiceUser: AppealServiceUser = {
	id: '1',
	firstName: 'John',
	lastName: 'Appellant',
	emailAddress: 'appellant@example.com',
	serviceUserType: SERVICE_USER_TYPE.APPELLANT,
	caseReference: 'APP/HAS/2024/001',
	addressLine1: '123 Main St',
	postcode: 'SW1A 1AA',
	salutation: null,
	addressLine2: null,
	addressTown: null,
	addressCounty: null,
	addressCountry: null,
	organisation: null,
	organisationType: null,
	role: null,
	telephoneNumber: null,
	otherPhoneNumber: null,
	faxNumber: null,
	webAddress: null,
	sourceSuid: null,
	sourceSystem: null
};

export const mockAgentServiceUser: AppealServiceUser = {
	id: '2',
	firstName: 'Jane',
	lastName: 'Agent',
	emailAddress: 'agent@example.com',
	telephoneNumber: '020 1234 5678',
	serviceUserType: SERVICE_USER_TYPE.AGENT,
	caseReference: 'APP/HAS/2024/001',
	salutation: null,
	addressLine1: null,
	addressLine2: null,
	addressTown: null,
	addressCounty: null,
	postcode: null,
	addressCountry: null,
	organisation: null,
	organisationType: null,
	role: null,
	otherPhoneNumber: null,
	faxNumber: null,
	webAddress: null,
	sourceSuid: null,
	sourceSystem: null
};

export const mockDuplicateAppellants: AppealServiceUser[] = [
	{
		...mockAppellantServiceUser,
		id: '1',
		firstName: 'First',
		lastName: 'Appellant',
		emailAddress: 'first@example.com',
		caseReference: 'CASE-010'
	},
	{
		...mockAppellantServiceUser,
		id: '2',
		firstName: 'Second',
		lastName: 'Appellant',
		emailAddress: 'second@example.com',
		caseReference: 'CASE-010'
	}
];

export const mockDuplicateAgents: AppealServiceUser[] = [
	{
		...mockAgentServiceUser,
		id: '1',
		firstName: 'First',
		lastName: 'Agent',
		emailAddress: 'first@example.com',
		caseReference: 'CASE-011'
	},
	{
		...mockAgentServiceUser,
		id: '2',
		firstName: 'Second',
		lastName: 'Agent',
		emailAddress: 'second@example.com',
		caseReference: 'CASE-011'
	}
];
