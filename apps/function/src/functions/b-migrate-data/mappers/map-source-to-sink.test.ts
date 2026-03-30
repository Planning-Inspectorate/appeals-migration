// @ts-nocheck
import type { AppealHas } from '@pins/odw-curated-database/src/client/client.ts';
import { Prisma } from '@pins/odw-curated-database/src/client/client.ts';
import {
	APPEAL_CASE_DECISION_OUTCOME,
	APPEAL_CASE_PROCEDURE,
	APPEAL_CASE_STATUS,
	APPEAL_CASE_VALIDATION_OUTCOME
} from '@planning-inspectorate/data-model';
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { FOLDERS } from './folders.ts';
import { mapSourceToSinkAppeal } from './map-source-to-sink.ts';
import * as MockCases from './test-data/mock-appeal-cases.ts';
import { mockAppealHasCase } from './test-data/mock-appeal-has-case.ts';
import {
	mockDuplicateHearingEvents,
	mockDuplicateInquiryEvents,
	mockDuplicateSiteVisitEvents,
	mockHearingEvent
} from './test-data/mock-events.ts';
import {
	mockAgentServiceUser,
	mockAppellantServiceUser,
	mockDuplicateAgents,
	mockDuplicateAppellants
} from './test-data/mock-service-users.ts';
import { mockValidationReasonLookups } from './test-data/mock-validation-reasons.ts';

describe('mapSourceToSinkAppeal - Appeal Mapping', () => {
	test('throws error for missing required fields', () => {
		assert.throws(
			() => mapSourceToSinkAppeal(MockCases.mockCaseWithoutReference, mockValidationReasonLookups),
			/caseReference is required/
		);
		assert.throws(
			() => mapSourceToSinkAppeal(MockCases.mockCaseWithoutLpaCode, mockValidationReasonLookups),
			/lpaCode is required/
		);
	});

	test('maps basic identification fields', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.strictEqual(result.reference, 'APP/HAS/2024/001');
		assert.strictEqual(result.submissionId, undefined);
		assert.strictEqual(result.applicationReference, 'APP-2024-001');
	});

	test('maps core date fields', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.strictEqual(result.caseCreatedDate?.toISOString(), '2024-01-10T09:00:00.000Z');
		assert.strictEqual(result.caseUpdatedDate?.toISOString(), '2024-01-20T14:30:00.000Z');
		assert.strictEqual(result.caseValidDate?.toISOString(), '2024-01-22T09:00:00.000Z');
		assert.strictEqual(result.caseStartedDate?.toISOString(), '2024-01-25T11:00:00.000Z');
		assert.strictEqual(result.caseExtensionDate, undefined);
		assert.strictEqual(result.casePublishedDate?.toISOString(), '2024-01-28T16:00:00.000Z');
	});

	test('maps lookup relations', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.ok(result.appealType);
		assert.strictEqual(result.appealType.connect.key, 'D');

		assert.ok(result.procedureType);
		assert.strictEqual(result.procedureType.connect.key, 'written');

		assert.ok(result.lpa);
		assert.strictEqual(result.lpa.connect.lpaCode, 'Q9999');
	});

	test('maps case procedure', () => {
		const result = mapSourceToSinkAppeal(
			{
				...mockAppealHasCase,
				caseProcedure: 'WR'
			},
			mockValidationReasonLookups
		);
		assert.ok(result.procedureType);
		assert.strictEqual(result.procedureType.connect.key, APPEAL_CASE_PROCEDURE.WRITTEN);
	});

	test('maps user assignments with connectOrCreate', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.ok(result.caseOfficer);
		assert.strictEqual(result.caseOfficer.connectOrCreate.where.azureAdUserId, 'officer-123');
		assert.strictEqual(result.caseOfficer.connectOrCreate.create.azureAdUserId, 'officer-123');

		assert.ok(result.inspector);
		assert.strictEqual(result.inspector.connectOrCreate.where.azureAdUserId, 'inspector-456');

		assert.strictEqual(result.padsInspector, undefined);
	});

	test('maps allocation details', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.ok(result.allocation);
		assert.strictEqual(result.allocation.create.level, 'A');
		assert.strictEqual(result.allocation.create.band, 1);
	});

	test('maps appeal status with createdAt timestamp', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.ok(result.appealStatus);
		assert.ok(result.appealStatus.create.length >= 1);

		// First status should be the current status
		const currentStatus = result.appealStatus.create.find((s) => s.valid === true);
		assert.ok(currentStatus);
		assert.strictEqual(currentStatus.status, 'ready_to_start');
		assert.strictEqual(currentStatus.createdAt?.toISOString(), '2024-01-20T14:30:00.000Z');
	});

	test('maps old appeal statuses', () => {
		const result = mapSourceToSinkAppeal(
			{
				...mockAppealHasCase,
				caseStatus: 'Decision Issued'
			},
			mockValidationReasonLookups
		);

		assert.ok(result.appealStatus);
		assert.ok(result.appealStatus.create.length >= 1);

		// First status should be the current status
		const currentStatus = result.appealStatus.create.find((s) => s.valid === true);
		assert.ok(currentStatus);
		assert.strictEqual(currentStatus.status, APPEAL_CASE_STATUS.COMPLETE);
		assert.strictEqual(currentStatus.createdAt?.toISOString(), '2024-01-20T14:30:00.000Z');
	});

	test('creates multiple appeal statuses based on available dates', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithMultipleStatuses, mockValidationReasonLookups);

		assert.ok(result.appealStatus);
		assert.strictEqual(result.appealStatus.create.length, 5);

		// Should have current status (valid=true)
		const validStatus = result.appealStatus.create.filter((s) => s.valid === true);
		assert.strictEqual(validStatus.length, 1);

		// Should have historical statuses (valid=false)
		const historicalStatuses = result.appealStatus.create.filter((s) => s.valid === false);
		assert.strictEqual(historicalStatuses.length, 4);

		// Check for READY_TO_START status
		const readyToStartStatus = result.appealStatus.create.find((s) => s.status === APPEAL_CASE_STATUS.READY_TO_START);
		assert.ok(readyToStartStatus);
		assert.strictEqual(readyToStartStatus.valid, false);

		// Check for EVENT status
		const eventStatus = result.appealStatus.create.find((s) => s.status === APPEAL_CASE_STATUS.EVENT);
		assert.ok(eventStatus);
		assert.strictEqual(eventStatus.valid, false);

		// Check for TRANSFERRED status
		const transferredStatus = result.appealStatus.create.find((s) => s.status === APPEAL_CASE_STATUS.TRANSFERRED);
		assert.ok(transferredStatus);
		assert.strictEqual(transferredStatus.valid, false);

		// Check for COMPLETE status
		const completeStatus = result.appealStatus.create.find((s) => s.status === APPEAL_CASE_STATUS.COMPLETE);
		assert.ok(completeStatus);
		assert.strictEqual(completeStatus.valid, false);
	});

	test('parses specialisms from comma-separated string', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.ok(result.specialisms);
		assert.strictEqual(result.specialisms.create.length, 2);
		assert.strictEqual(result.specialisms.create[0].specialism.connectOrCreate.where.name, 'Access');
		assert.strictEqual(result.specialisms.create[1].specialism.connectOrCreate.where.name, 'Listed building');
	});

	test('maps address fields', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.ok(result.address);
		assert.strictEqual(result.address.create.addressLine1, '123 Main Street');
		assert.strictEqual(result.address.create.addressTown, 'London');
		assert.strictEqual(result.address.create.addressCounty, 'Greater London');
		assert.strictEqual(result.address.create.postcode, 'SW1A 1AA');
	});

	test('maps appeal timetable', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.ok(result.appealTimetable);
		assert.strictEqual(
			result.appealTimetable.create.lpaQuestionnaireDueDate?.toISOString(),
			'2024-02-15T23:59:59.000Z'
		);
	});

	test('does not create appeal timetable when both dates are null', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullTimetable, mockValidationReasonLookups);

		assert.strictEqual(result.appealTimetable, undefined);
	});

	test('maps inspector decision when outcome exists', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithDecision, mockValidationReasonLookups);

		assert.ok(result.inspectorDecision);
		assert.strictEqual(result.inspectorDecision.create.outcome, 'allowed');
		assert.strictEqual(
			result.inspectorDecision.create.caseDecisionOutcomeDate?.toISOString(),
			'2024-03-01T10:00:00.000Z'
		);
	});

	test('maps inspector decision when outcome exists', () => {
		const result = mapSourceToSinkAppeal(
			{
				...MockCases.mockCaseWithDecision,
				caseDecisionOutcome: 'Planning permission granted'
			},
			mockValidationReasonLookups
		);

		assert.ok(result.inspectorDecision);
		assert.strictEqual(
			result.inspectorDecision.create.outcome,
			APPEAL_CASE_DECISION_OUTCOME.PLANNING_PERMISSION_GRANTED
		);
		assert.strictEqual(
			result.inspectorDecision.create.caseDecisionOutcomeDate?.toISOString(),
			'2024-03-01T10:00:00.000Z'
		);
	});

	test('handles nearby case references', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithReferences, mockValidationReasonLookups);

		assert.ok(result.childAppeals);
		assert.strictEqual(result.childAppeals.create.length, 2);
		assert.strictEqual(result.childAppeals.create[0].type, 'related');
		assert.strictEqual(result.childAppeals.create[0].parentRef, 'APP/HAS/2024/001');
		assert.strictEqual(result.childAppeals.create[0].childRef, 'APP/2024/100');
	});

	test('builds parentAppeals relation when linkedCaseStatus is child', () => {
		const source = {
			...mockAppealHasCase,
			linkedCaseStatus: 'child',
			leadCaseReference: 'APP/HAS/2024/LEAD'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.parentAppeals);
		assert.strictEqual(result.parentAppeals.create.length, 1);
		assert.strictEqual(result.parentAppeals.create[0].type, 'linked');
		assert.strictEqual(result.parentAppeals.create[0].parentRef, 'APP/HAS/2024/LEAD');
		assert.strictEqual(result.parentAppeals.create[0].childRef, 'APP/HAS/2024/001');
	});

	test('omits parentAppeals when linkedCaseStatus is not child', () => {
		const source = {
			...mockAppealHasCase,
			linkedCaseStatus: 'lead',
			leadCaseReference: 'APP/HAS/2024/LEAD'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.strictEqual(result.parentAppeals, undefined);
	});

	test('omits parentAppeals when linkedCaseStatus is Not Linked (old value)', () => {
		const source = {
			...mockAppealHasCase,
			linkedCaseStatus: 'Not Linked',
			leadCaseReference: 'APP/HAS/2024/LEAD'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.strictEqual(result.parentAppeals, undefined);
	});

	test('throws error when linkedCaseStatus is child but leadCaseReference is missing', () => {
		const source = {
			...mockAppealHasCase,
			linkedCaseStatus: 'child',
			leadCaseReference: null
		};

		assert.throws(
			() => mapSourceToSinkAppeal(source, mockValidationReasonLookups),
			{
				message: /has linkedCaseStatus='child' but is missing leadCaseReference/
			},
			'Should throw error when child case is missing parent reference'
		);
	});

	test('handles optional fields gracefully', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		// These should be undefined when source data is null
		assert.strictEqual(result.submissionId, undefined);
		assert.strictEqual(result.caseExtensionDate, undefined);
		assert.ok(result.address);
		assert.strictEqual(result.childAppeals, undefined);
		assert.strictEqual(result.neighbouringSites, undefined);
	});

	test('handles padsSapId null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullPads, mockValidationReasonLookups);

		assert.strictEqual(result.padsInspector, undefined);
	});

	test('handles padsSapId with value', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithPads, mockValidationReasonLookups);

		assert.ok(result.padsInspector);
		assert.strictEqual(result.padsInspector.connectOrCreate.where.sapId, 'SAP-123');
	});

	test('handles caseOfficer null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullOfficer, mockValidationReasonLookups);

		assert.strictEqual(result.caseOfficer, undefined);
	});

	test('handles inspector null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullInspector, mockValidationReasonLookups);

		assert.strictEqual(result.inspector, undefined);
	});

	test('handles allocation null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullAllocation, mockValidationReasonLookups);

		assert.strictEqual(result.allocation, undefined);
	});

	test('handles specialisms null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullSpecialisms, mockValidationReasonLookups);

		assert.strictEqual(result.specialisms, undefined);
	});

	test('handles inspector decision null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullDecision, mockValidationReasonLookups);

		assert.strictEqual(result.inspectorDecision, undefined);
	});

	test('handles caseWithdrawnDate null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullWithdrawn, mockValidationReasonLookups);

		// Should not have WITHDRAWN status
		const withdrawnStatus = result.appealStatus?.create.find((s) => s.status === APPEAL_CASE_STATUS.WITHDRAWN);
		assert.strictEqual(withdrawnStatus, undefined);
	});

	test('handles caseType null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullType, mockValidationReasonLookups);

		assert.strictEqual(result.appealType, undefined);
	});

	test('handles caseProcedure null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullProcedure, mockValidationReasonLookups);

		assert.strictEqual(result.procedureType, undefined);
	});

	test('handles applicationReference null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullAppRef, mockValidationReasonLookups);

		assert.strictEqual(result.applicationReference, undefined);
	});

	test('handles date fields null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullDates, mockValidationReasonLookups);

		assert.strictEqual(result.caseCreatedDate, undefined);
		assert.strictEqual(result.caseUpdatedDate, undefined);
		assert.strictEqual(result.caseValidDate, undefined);
		assert.strictEqual(result.caseExtensionDate, undefined);
		assert.strictEqual(result.caseStartedDate, undefined);
		assert.strictEqual(result.casePublishedDate, undefined);
	});

	test('handles nearbyCaseReferences null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullReferences, mockValidationReasonLookups);

		assert.strictEqual(result.childAppeals, undefined);
	});

	test('handles neighbouringSiteAddresses null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullNeighbours, mockValidationReasonLookups);

		assert.strictEqual(result.neighbouringSites, undefined);
	});

	test('maps appellant from service users', () => {
		const sourceCase = {
			caseReference: 'CASE-006',
			lpaCode: 'Q9999',
			caseSubmittedDate: '2024-01-01T00:00:00.000Z',
			applicationDecision: 'refused'
		};
		const serviceUsers = [{ ...mockAppellantServiceUser, caseReference: 'CASE-006' }];

		const result = mapSourceToSinkAppeal(sourceCase, mockValidationReasonLookups, undefined, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-006');
		assert.ok(result.appellant);
		assert.ok(result.appellant.create);
		assert.strictEqual(result.appellant.create.firstName, 'John');
		assert.strictEqual(result.appellant.create.lastName, 'Appellant');
		assert.strictEqual(result.appellant.create.email, 'appellant@example.com');
		assert.ok(result.appellant.create.address);
	});

	test('maps agent from service users', () => {
		const sourceCase = {
			caseReference: 'CASE-007',
			lpaCode: 'Q9999',
			caseSubmittedDate: '2024-01-01T00:00:00.000Z',
			applicationDecision: 'refused'
		};
		const serviceUsers = [{ ...mockAgentServiceUser, caseReference: 'CASE-007' }];

		const result = mapSourceToSinkAppeal(sourceCase, mockValidationReasonLookups, undefined, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-007');
		assert.ok(result.agent);
		assert.ok(result.agent.create);
		assert.strictEqual(result.agent.create.firstName, 'Jane');
		assert.strictEqual(result.agent.create.lastName, 'Agent');
		assert.strictEqual(result.agent.create.email, 'agent@example.com');
		assert.strictEqual(result.agent.create.phoneNumber, '020 1234 5678');
	});

	test('maps both events and service users', () => {
		const sourceCase = {
			caseReference: 'CASE-008',
			lpaCode: 'Q9999',
			caseSubmittedDate: '2024-01-01T00:00:00.000Z',
			applicationDecision: 'refused'
		};
		const events = [mockHearingEvent];
		const serviceUsers = [{ ...mockAppellantServiceUser, caseReference: 'CASE-008' }];

		const result = mapSourceToSinkAppeal(sourceCase, mockValidationReasonLookups, events, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-008');
		assert.ok(result.hearing?.create);
		assert.ok(result.appellant?.create);
		assert.strictEqual(result.appellant.create.firstName, 'John');
	});

	test('maps all service user types together in one appeal', () => {
		const sourceCase = {
			caseReference: 'CASE-016',
			lpaCode: 'Q9999',
			caseSubmittedDate: '2024-01-01T00:00:00.000Z',
			applicationDecision: 'refused'
		};
		const serviceUsers = [
			{
				firstName: 'John',
				emailAddress: 'appellant@example.com',
				serviceUserType: 'Appellant',
				caseReference: 'CASE-016'
			},
			{ firstName: 'Jane', emailAddress: 'agent@example.com', serviceUserType: 'Agent', caseReference: 'CASE-016' },
			{
				firstName: 'Alice',
				emailAddress: 'interested@example.com',
				serviceUserType: 'InterestedParty',
				caseReference: 'CASE-016'
			},
			{ firstName: 'Bob', emailAddress: 'rule6@example.com', serviceUserType: 'Rule6Party', caseReference: 'CASE-016' }
		];

		const result = mapSourceToSinkAppeal(sourceCase, mockValidationReasonLookups, undefined, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-016');

		assert.ok(result.appellant);
		assert.ok(result.appellant.create);
		assert.strictEqual(result.appellant.create.firstName, 'John');

		assert.ok(result.agent);
		assert.ok(result.agent.create);
		assert.strictEqual(result.agent.create.firstName, 'Jane');

		assert.ok(result.representations);
		assert.ok(result.representations.create);
		assert.ok(Array.isArray(result.representations.create));
		assert.strictEqual(result.representations.create.length, 1);
		assert.strictEqual(result.representations.create[0].represented.create.firstName, 'Alice');

		assert.ok(result.appealRule6Parties);
		assert.ok(result.appealRule6Parties.create);
		assert.strictEqual(result.appealRule6Parties.create.length, 1);
		assert.strictEqual(result.appealRule6Parties.create[0].serviceUser.create.firstName, 'Bob');
	});

	test('handles empty service users array', () => {
		const result = mapSourceToSinkAppeal(
			{
				caseReference: 'CASE-009',
				lpaCode: 'Q9999',
				caseSubmittedDate: '2024-01-01T00:00:00.000Z',
				applicationDecision: 'refused'
			},
			mockValidationReasonLookups,
			undefined,
			[]
		);

		assert.strictEqual(result.reference, 'CASE-009');
		assert.strictEqual(result.appellant, undefined);
		assert.strictEqual(result.agent, undefined);
	});

	test('throws error for duplicate service users', () => {
		const duplicateServiceUserCases = [
			{ type: 'appellant', users: mockDuplicateAppellants, expectedError: /Duplicate appellant/ },
			{ type: 'agent', users: mockDuplicateAgents, expectedError: /Duplicate agent/ }
		];

		for (const { type, users, expectedError } of duplicateServiceUserCases) {
			assert.throws(
				() =>
					mapSourceToSinkAppeal(
						{
							caseReference: 'CASE-010',
							lpaCode: 'Q9999',
							caseSubmittedDate: '2024-01-01T00:00:00.000Z',
							applicationDecision: 'refused'
						},
						mockValidationReasonLookups,
						undefined,
						users
					),
				{ message: expectedError },
				`Should throw error for duplicate ${type}`
			);
		}
	});

	test('throws error for invalid JSON in specialisms', () => {
		assert.throws(
			() => mapSourceToSinkAppeal(MockCases.mockCaseWithInvalidJsonSpecialisms, mockValidationReasonLookups),
			{
				message: /Invalid JSON for specialisms/
			}
		);
	});

	test('throws error for non-array JSON in specialisms', () => {
		assert.throws(
			() => mapSourceToSinkAppeal(MockCases.mockCaseWithNonArrayJsonSpecialisms, mockValidationReasonLookups),
			{
				message: /Expected JSON array for specialisms/
			}
		);
	});

	test('handles neighbouring addresses as array input', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithArrayAddresses, mockValidationReasonLookups);

		assert.ok(result.neighbouringSites);
		assert.strictEqual(result.neighbouringSites.create.length, 2);
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressLine1, '123 Main St');
	});

	test('handles neighbouring addresses as empty array', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithEmptyArrayAddresses, mockValidationReasonLookups);

		assert.strictEqual(result.neighbouringSites, undefined);
	});

	test('throws error for invalid JSON in neighbouring addresses', () => {
		assert.throws(
			() => mapSourceToSinkAppeal(MockCases.mockCaseWithInvalidJsonAddresses, mockValidationReasonLookups),
			{
				message: /Invalid JSON for neighbouringSiteAddresses/
			}
		);
	});

	test('throws error for non-array JSON in neighbouring addresses', () => {
		assert.throws(
			() => mapSourceToSinkAppeal(MockCases.mockCaseWithNonArrayJsonAddresses, mockValidationReasonLookups),
			{
				message: /Expected JSON array for neighbouringSiteAddresses/
			}
		);
	});

	test('handles neighbouring addresses JSON with empty array', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithEmptyJsonArrayAddresses, mockValidationReasonLookups);

		assert.strictEqual(result.neighbouringSites, undefined);
	});

	test('maps allocation with populated values', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithAllocation, mockValidationReasonLookups);

		assert.ok(result.allocation);
		assert.strictEqual(result.allocation.create.level, 'C');
		assert.strictEqual(result.allocation.create.band, 2);
	});

	test('maps timetable with only lpaQuestionnaireDueDate', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithLpaDate, mockValidationReasonLookups);

		assert.ok(result.appealTimetable);
		assert.strictEqual(
			result.appealTimetable.create.lpaQuestionnaireDueDate?.toISOString(),
			'2024-06-01T10:00:00.000Z'
		);
	});

	test('maps caseExtensionDate when populated', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithExtension, mockValidationReasonLookups);

		assert.strictEqual(result.caseExtensionDate?.toISOString(), '2024-05-15T10:00:00.000Z');
	});

	test('creates COMPLETE status when caseCompletedDate is populated', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithCompleted, mockValidationReasonLookups);

		const completeStatus = result.appealStatus?.create.find((s) => s.status === APPEAL_CASE_STATUS.COMPLETE);
		assert.ok(completeStatus);
		assert.strictEqual(completeStatus.createdAt?.toISOString(), '2024-08-01T10:00:00.000Z');
		assert.strictEqual(completeStatus.valid, false);
	});

	test('creates CLOSED status when transferredCaseClosedDate is populated', () => {
		const source = {
			...mockAppealHasCase,
			transferredCaseClosedDate: '2024-04-01T10:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		const closedStatus = result.appealStatus?.create.find((s) => s.status === APPEAL_CASE_STATUS.CLOSED);
		assert.ok(closedStatus);
		assert.strictEqual(closedStatus.createdAt?.toISOString(), '2024-04-01T10:00:00.000Z');
		assert.strictEqual(closedStatus.valid, false);
	});

	test('does not create CLOSED status when transferredCaseClosedDate is null', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		const closedStatus = result.appealStatus?.create.find((s) => s.status === APPEAL_CASE_STATUS.CLOSED);
		assert.strictEqual(closedStatus, undefined);
	});

	test('creates WITHDRAWN status when caseWithdrawnDate is populated', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithWithdrawn, mockValidationReasonLookups);

		const withdrawnStatus = result.appealStatus?.create.find((s) => s.status === APPEAL_CASE_STATUS.WITHDRAWN);
		assert.ok(withdrawnStatus);
		assert.strictEqual(withdrawnStatus.createdAt?.toISOString(), '2024-07-15T10:00:00.000Z');
		assert.strictEqual(withdrawnStatus.valid, false);
	});

	test('handles allocationBand as regular number (non-Decimal)', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNumberBand, mockValidationReasonLookups);

		assert.ok(result.allocation);
		assert.strictEqual(result.allocation.create.band, 3);
	});

	test('throws error for duplicate events', () => {
		const duplicateEventCases = [
			{ type: 'hearing', events: mockDuplicateHearingEvents, expectedError: /Duplicate hearing event/ },
			{ type: 'inquiry', events: mockDuplicateInquiryEvents, expectedError: /Duplicate inquiry event/ },
			{ type: 'siteVisit', events: mockDuplicateSiteVisitEvents, expectedError: /Duplicate siteVisit event/ }
		];

		for (const { type, events, expectedError } of duplicateEventCases) {
			assert.throws(
				() => mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups, events),
				{ message: expectedError },
				`Should throw error for duplicate ${type} events`
			);
		}
	});

	test('throws error for duplicate appeal status', () => {
		assert.throws(
			() => mapSourceToSinkAppeal(MockCases.mockCaseWithDuplicateStatus, mockValidationReasonLookups),
			{ message: /Duplicate status 'ready_to_start' found/ },
			'Should throw error when current status matches a historical status'
		);
	});

	test('handles allocation with undefined band', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithUndefinedBand, mockValidationReasonLookups);

		// Should not create allocation if band is undefined
		assert.strictEqual(result.allocation, undefined);
	});

	test('handles neighbouring addresses with schema fields', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithSchemaAddresses, mockValidationReasonLookups);

		assert.ok(result.neighbouringSites);
		assert.strictEqual(result.neighbouringSites.create.length, 1);
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressLine1, '125 Main Street');
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressLine2, 'Apt 2');
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressTown, 'London');
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressCounty, 'Greater London');
		assert.strictEqual(result.neighbouringSites.create[0].address.create.postcode, 'SW1A 1AB');
	});

	test('handles parseNumber with Decimal type', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			allocationLevel: 'C',
			allocationBand: new Prisma.Decimal(2)
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.allocation);
		assert.strictEqual(result.allocation.create.band, 2);
	});

	test('appellant case handles null and undefined fields gracefully', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseSubmittedDate: '2024-01-15T10:00:00.000Z',
			applicationDate: null,
			applicationDecision: 'refused',
			applicationDecisionDate: null,
			siteAccessDetails: null,
			siteSafetyDetails: null,
			siteAreaSquareMetres: null,
			floorSpaceSquareMetres: null,
			ownsAllLand: null,
			ownsSomeLand: null,
			knowsOtherOwners: null,
			knowsAllOwners: null,
			ownersInformed: null,
			advertisedAppeal: null,
			originalDevelopmentDescription: null,
			changedDevelopmentDescription: null,
			enforcementNotice: null,
			isGreenBelt: null,
			appellantCostsAppliedFor: null
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		assert.ok(result.appellantCase.create);
		const appellantCase = result.appellantCase.create;

		// Should have defaults or undefined for null values
		assert.ok(appellantCase.caseSubmittedDate); // Has default
		assert.strictEqual(appellantCase.applicationDecision, 'refused'); // Has default
		assert.strictEqual(appellantCase.applicationDate, undefined);
		assert.strictEqual(appellantCase.siteAccessDetails, undefined);
		assert.strictEqual(appellantCase.knowsOtherOwners, undefined);
		assert.strictEqual(appellantCase.knowsAllOwners, undefined);
	});

	test('uses placeholder values when required fields are missing', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseSubmittedDate: null,
			applicationDecision: null
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.appellantCase?.create);
		const appellantCase = result.appellantCase.create;

		// Should use placeholder date when caseSubmittedDate is missing
		assert.deepStrictEqual(appellantCase.caseSubmittedDate, new Date(0));
		// Should use placeholder string with case reference when applicationDecision is missing
		assert.strictEqual(appellantCase.applicationDecision, `Not available ${mockAppealHasCase.caseReference}`);
	});

	test('parseNumber handles invalid values', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			allocationLevel: 'C',
			allocationBand: 'invalid' as any
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		// Should handle invalid number gracefully - allocation should be undefined when band is invalid
		assert.strictEqual(result.allocation, undefined);
	});

	test('verifies all appellant case field mappings', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			// Test all key appellant case fields with specific values
			caseSubmittedDate: '2024-01-15T10:00:00.000Z',
			caseSubmissionDueDate: '2024-02-15T10:00:00.000Z',
			caseValidationOutcome: 'valid',
			caseValidationIncompleteDetails: null,
			caseValidationInvalidDetails: null,
			applicationDate: '2023-12-01T10:00:00.000Z',
			applicationDecision: 'refused',
			applicationDecisionDate: '2023-12-20T10:00:00.000Z',
			siteAccessDetails: 'Access via main gate with parking',
			siteSafetyDetails: 'Beware of dog, wear protective equipment',
			siteAreaSquareMetres: 150.75,
			floorSpaceSquareMetres: 75.5,
			ownsAllLand: true,
			ownsSomeLand: false,
			knowsOtherOwners: 'Yes',
			knowsAllOwners: 'No',
			ownersInformed: true,
			advertisedAppeal: true,
			originalDevelopmentDescription: 'Two-storey rear extension with balcony',
			changedDevelopmentDescription: false,
			enforcementNotice: false,
			isGreenBelt: true,
			typeOfPlanningApplication: 'full-appeal',
			caseworkReason: 'Appeal requires full hearing due to complexity',
			jurisdiction: 'England',
			siteGridReferenceEasting: '357144',
			siteGridReferenceNorthing: '400534',
			hasLandownersPermission: true,
			advertDetails:
				'[{"advertType":"4-6 Sheet Non-Illuminated","isAdvertInPosition":true,"isSiteOnHighwayLand":false}]',
			appellantCostsAppliedFor: true
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		// Verify appellant case is created
		assert.ok(result.appellantCase);
		assert.ok(result.appellantCase.create);
		const appellantCase = result.appellantCase.create;

		// Verify all field mappings
		assert.deepStrictEqual(appellantCase.caseSubmittedDate, new Date('2024-01-15T10:00:00.000Z'));
		assert.deepStrictEqual(appellantCase.caseSubmissionDueDate, new Date('2024-02-15T10:00:00.000Z'));

		// Verify validation outcome
		assert.ok(appellantCase.appellantCaseValidationOutcome);
		assert.strictEqual(appellantCase.appellantCaseValidationOutcome.connect.name, 'valid');

		assert.deepStrictEqual(appellantCase.applicationDate, new Date('2023-12-01T10:00:00.000Z'));
		assert.strictEqual(appellantCase.applicationDecision, 'refused');
		assert.deepStrictEqual(appellantCase.applicationDecisionDate, new Date('2023-12-20T10:00:00.000Z'));
		assert.strictEqual(appellantCase.siteAccessDetails, 'Access via main gate with parking');
		assert.strictEqual(appellantCase.siteSafetyDetails, 'Beware of dog, wear protective equipment');
		assert.strictEqual(appellantCase.siteAreaSquareMetres, 150.75);
		assert.strictEqual(appellantCase.floorSpaceSquareMetres, 75.5);
		assert.strictEqual(appellantCase.ownsAllLand, true);
		assert.strictEqual(appellantCase.ownsSomeLand, false);
		assert.ok(appellantCase.knowsOtherOwners);
		assert.strictEqual(appellantCase.knowsOtherOwners.connect.name, 'Yes');
		assert.ok(appellantCase.knowsAllOwners);
		assert.strictEqual(appellantCase.knowsAllOwners.connect.name, 'No');
		assert.strictEqual(appellantCase.ownersInformed, true);
		assert.strictEqual(appellantCase.hasAdvertisedAppeal, true);
		assert.strictEqual(appellantCase.originalDevelopmentDescription, 'Two-storey rear extension with balcony');
		assert.strictEqual(appellantCase.changedDevelopmentDescription, false);
		assert.strictEqual(appellantCase.enforcementNotice, false);
		assert.strictEqual(appellantCase.isGreenBelt, true);
		assert.strictEqual(appellantCase.typeOfPlanningApplication, 'full-appeal');
		assert.strictEqual(appellantCase.caseworkReason, 'Appeal requires full hearing due to complexity');
		assert.strictEqual(appellantCase.jurisdiction, 'England');
		assert.strictEqual(appellantCase.siteGridReferenceEasting, '357144');
		assert.strictEqual(appellantCase.siteGridReferenceNorthing, '400534');
		assert.strictEqual(appellantCase.landownerPermission, true);

		// Verify advert details
		assert.ok(appellantCase.appellantCaseAdvertDetails);
		assert.ok(appellantCase.appellantCaseAdvertDetails.create);
		assert.strictEqual(appellantCase.appellantCaseAdvertDetails.create.length, 1);
		const advertDetail = appellantCase.appellantCaseAdvertDetails.create[0];
		assert.strictEqual(advertDetail.advertInPosition, true);
		assert.strictEqual(advertDetail.highwayLand, false);

		assert.strictEqual(appellantCase.appellantCostsAppliedFor, true);
	});

	test('maps validation outcome', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseValidationOutcome: 'Invalid - Missing Information'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		// Verify appellant case is created
		assert.ok(result.appellantCase);
		assert.ok(result.appellantCase.create);
		const appellantCase = result.appellantCase.create;

		// Verify validation outcome
		assert.ok(appellantCase.appellantCaseValidationOutcome);
		assert.strictEqual(
			appellantCase.appellantCaseValidationOutcome.connect.name,
			APPEAL_CASE_VALIDATION_OUTCOME.INVALID
		);
	});

	test('maps validation incomplete reasons with text', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseValidationIncompleteDetails:
				'["Appellant name is not the same: Additional context", "LPA\'s decision notice is missing"]'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;

		assert.ok(appellantCase.appellantCaseIncompleteReasonsSelected);
		assert.ok(appellantCase.appellantCaseIncompleteReasonsSelected.create);
		assert.strictEqual(appellantCase.appellantCaseIncompleteReasonsSelected.create.length, 2);

		// First reason with text
		const reason1 = appellantCase.appellantCaseIncompleteReasonsSelected.create[0];
		assert.ok(reason1.appellantCaseIncompleteReason);
		assert.strictEqual(reason1.appellantCaseIncompleteReason.connect.id, 1);
		assert.ok(reason1.appellantCaseIncompleteReasonText);
		assert.strictEqual(reason1.appellantCaseIncompleteReasonText.create[0].text, 'Additional context');

		// Second reason without text
		const reason2 = appellantCase.appellantCaseIncompleteReasonsSelected.create[1];
		assert.ok(reason2.appellantCaseIncompleteReason);
		assert.strictEqual(reason2.appellantCaseIncompleteReason.connect.id, 2);
		assert.strictEqual(reason2.appellantCaseIncompleteReasonText, undefined);
	});

	test('maps validation invalid reasons with text', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseValidationInvalidDetails: '["Appeal has not been submitted on time: 5 days late", "Other: Custom reason"]'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;

		assert.ok(appellantCase.appellantCaseInvalidReasonsSelected);
		assert.ok(appellantCase.appellantCaseInvalidReasonsSelected.create);
		assert.strictEqual(appellantCase.appellantCaseInvalidReasonsSelected.create.length, 2);

		// First reason with text
		const reason1 = appellantCase.appellantCaseInvalidReasonsSelected.create[0];
		assert.ok(reason1.appellantCaseInvalidReason);
		assert.strictEqual(reason1.appellantCaseInvalidReason.connect.id, 1);
		assert.ok(reason1.appellantCaseInvalidReasonText);
		assert.strictEqual(reason1.appellantCaseInvalidReasonText.create[0].text, '5 days late');

		// Second reason with text
		const reason2 = appellantCase.appellantCaseInvalidReasonsSelected.create[1];
		assert.ok(reason2.appellantCaseInvalidReason);
		assert.strictEqual(reason2.appellantCaseInvalidReason.connect.id, 3);
		assert.ok(reason2.appellantCaseInvalidReasonText);
		assert.strictEqual(reason2.appellantCaseInvalidReasonText.create[0].text, 'Custom reason');
	});

	test('handles empty validation details array', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseValidationIncompleteDetails: '[]',
			caseValidationInvalidDetails: '[]'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;

		assert.strictEqual(appellantCase.appellantCaseIncompleteReasonsSelected, undefined);
		assert.strictEqual(appellantCase.appellantCaseInvalidReasonsSelected, undefined);
	});

	test('handles null validation details', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseValidationIncompleteDetails: null,
			caseValidationInvalidDetails: null
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;

		assert.strictEqual(appellantCase.appellantCaseIncompleteReasonsSelected, undefined);
		assert.strictEqual(appellantCase.appellantCaseInvalidReasonsSelected, undefined);
	});

	test('throws error for invalid JSON in validation incomplete details', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseValidationIncompleteDetails: '{invalid json}'
		};

		assert.throws(() => mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups), {
			message: /Invalid JSON for caseValidationIncompleteDetails/
		});
	});

	test('throws error for invalid JSON in validation invalid details', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseValidationInvalidDetails: '{not valid json'
		};

		assert.throws(() => mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups), {
			message: /Invalid JSON for caseValidationInvalidDetails/
		});
	});

	test('throws error for unknown incomplete reason', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseValidationIncompleteDetails: '["Unknown reason that does not exist"]'
		};

		assert.throws(() => mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups), {
			message: /Unknown incompletedetails reason: "Unknown reason that does not exist"/
		});
	});

	test('throws error for unknown invalid reason', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			caseValidationInvalidDetails: '["This reason does not exist in database"]'
		};

		assert.throws(() => mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups), {
			message: /Unknown invaliddetails reason: "This reason does not exist in database"/
		});
	});

	test('throws error for invalid JSON in advertDetails', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			advertDetails: '{invalid json}'
		};

		assert.throws(() => mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups), {
			message: /Invalid JSON for advertDetails/
		});
	});

	test('handles advertDetails with null boolean values', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			advertDetails: '[{"advertType":"Other","isAdvertInPosition":null,"isSiteOnHighwayLand":null}]'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;

		assert.ok(appellantCase.appellantCaseAdvertDetails);
		assert.strictEqual(appellantCase.appellantCaseAdvertDetails.create.length, 1);
		// Should default to false when null
		assert.strictEqual(appellantCase.appellantCaseAdvertDetails.create[0].advertInPosition, false);
		assert.strictEqual(appellantCase.appellantCaseAdvertDetails.create[0].highwayLand, false);
	});

	test('handles empty advertDetails array', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			advertDetails: '[]'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;

		assert.strictEqual(appellantCase.appellantCaseAdvertDetails, undefined);
	});

	test('handles advertDetails as JSON string', () => {
		const mockCase: AppealHas = {
			...mockAppealHasCase,
			advertDetails:
				'[{"advertType": "4-6 Sheet Non-Illuminated", "isAdvertInPosition": true, "isSiteOnHighwayLand": false}]'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;

		assert.ok(appellantCase.appellantCaseAdvertDetails);
		assert.strictEqual(appellantCase.appellantCaseAdvertDetails.create.length, 1);
		assert.strictEqual(appellantCase.appellantCaseAdvertDetails.create[0].advertInPosition, true);
		assert.strictEqual(appellantCase.appellantCaseAdvertDetails.create[0].highwayLand, false);
	});

	test('parseDate returns undefined for invalid date string', () => {
		const mockCase = {
			...mockAppealHasCase,
			caseCreatedDate: 'invalid-date'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);
		assert.strictEqual(result.caseCreatedDate, undefined);
	});

	test('parseNumber handles numeric string', () => {
		const mockCase = {
			...mockAppealHasCase,
			allocationLevel: 'C',
			allocationBand: '2'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);
		assert.strictEqual(result.allocation.create.band, 2);
	});

	test('stringOrUndefined handles whitespace-only strings', () => {
		const mockCase = {
			...mockAppealHasCase,
			applicationReference: '   '
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);
		assert.strictEqual(result.applicationReference, undefined);
	});

	test('buildAppealAllocation returns undefined when allocationLevel is null but band present', () => {
		const mockCase = {
			...mockAppealHasCase,
			allocationLevel: null,
			allocationBand: '2'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);
		assert.strictEqual(result.allocation, undefined);
	});

	test('buildUserConnection handles empty string', () => {
		const mockCase = {
			...mockAppealHasCase,
			caseOfficerId: ''
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);
		assert.strictEqual(result.caseOfficer, undefined);
	});

	test('addEventIfNotDuplicate handles multiple different event types', () => {
		const mockCase = {
			...mockAppealHasCase,
			caseReference: 'APP/HAS/2024/001'
		};

		const events = [
			{ ...mockHearingEvent, id: 'hearing-1' },
			{ ...mockDuplicateInquiryEvents[0], id: 'inquiry-1' },
			{ ...mockDuplicateSiteVisitEvents[0], id: 'site-visit-1' }
		];

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups, events, []);

		assert.ok(result.hearing);
		assert.ok(result.inquiry);
		assert.ok(result.siteVisit);
	});

	test('addUniqueServiceUser handles both appellant and agent simultaneously', () => {
		const mockCase = {
			...mockAppealHasCase,
			caseReference: 'APP/HAS/2024/001'
		};

		const serviceUsers = [mockAppellantServiceUser, mockAgentServiceUser];

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups, [], serviceUsers);

		assert.ok(result.appellant);
		assert.ok(result.agent);
		// Check the structure matches what the mapper actually creates
		assert.ok(result.appellant.create);
		assert.ok(result.agent.create);
	});

	test('parseJsonArray handles JSON string for specialisms', () => {
		const mockCase = {
			...mockAppealHasCase,
			caseSpecialisms: '["Environmental", "Heritage"]'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);
		assert.ok(result.specialisms);
		assert.strictEqual(result.specialisms.create.length, 2);
	});

	test('parseJsonArray handles JSON string for validation reasons', () => {
		const mockCase = {
			...mockAppealHasCase,
			caseValidationIncompleteDetails: '["Appellant name is not the same"]'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);
		assert.ok(result.appellantCase);
		assert.ok(result.appellantCase.create.appellantCaseIncompleteReasonsSelected);
		assert.strictEqual(result.appellantCase.create.appellantCaseIncompleteReasonsSelected.create.length, 1);
	});

	test('parseJsonArray handles JSON string for nearby case references', () => {
		const mockCase = {
			...mockAppealHasCase,
			caseReference: 'APP/HAS/2024/001',
			nearbyCaseReferences: '["APP/HAS/2024/002", "APP/HAS/2024/003"]'
		};

		const result = mapSourceToSinkAppeal(mockCase, mockValidationReasonLookups);
		assert.ok(result.childAppeals);
		assert.strictEqual(result.childAppeals.create.length, 2);
	});
});

describe('mapSourceToSinkAppeal - LPA Questionnaire Mapping', () => {
	test('returns undefined lpaQuestionnaire when all fields are null', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.strictEqual(result.lpaQuestionnaire, undefined);
	});

	test('maps scalar date fields', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireCreatedDate: '2024-02-05T09:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaQuestionnaireSubmittedDate?.toISOString(),
			'2024-02-10T10:00:00.000Z'
		);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaqCreatedDate?.toISOString(), '2024-02-05T09:00:00.000Z');
	});

	test('does not set lpaqCreatedDate when lpaQuestionnaireCreatedDate is null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireCreatedDate: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaqCreatedDate, undefined);
	});

	test('maps lpaProcedurePreferenceDuration Decimal to number', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaProcedurePreferenceDuration: new Prisma.Decimal(3)
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreferenceDuration, 3);
	});

	test('maps lpaQuestionnaireValidationOutcome via connect by name', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireValidationOutcome: 'complete'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.lpaQuestionnaireValidationOutcome);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaQuestionnaireValidationOutcome.connect.name, 'complete');
	});

	test('omits lpaQuestionnaireValidationOutcome when null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireValidationOutcome: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaQuestionnaireValidationOutcome, undefined);
	});

	test('maps notificationMethod JSON array to lpaNotificationMethods array', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			notificationMethod: '["letter","email","site-notice"]'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.lpaNotificationMethods);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaNotificationMethods.create.length, 3);
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaNotificationMethods.create[0].lpaNotificationMethod.connect.key,
			'letter'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaNotificationMethods.create[1].lpaNotificationMethod.connect.key,
			'email'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaNotificationMethods.create[2].lpaNotificationMethod.connect.key,
			'site-notice'
		);
	});

	test('omits lpaNotificationMethods when notificationMethod is null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			notificationMethod: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaNotificationMethods, undefined);
	});

	test('maps boolean fields', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			isCorrectAppealType: true,
			inConservationArea: false,
			affectsScheduledMonument: false,
			isAonbNationalLandscape: true,
			hasProtectedSpecies: false,
			hasInfrastructureLevy: true,
			isInfrastructureLevyFormallyAdopted: false,
			lpaCostsAppliedFor: true,
			isSiteInAreaOfSpecialControlAdverts: false,
			wasApplicationRefusedDueToHighwayOrTraffic: true,
			didAppellantSubmitCompletePhotosAndPlans: false
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.isCorrectAppealType, true);
		assert.strictEqual(result.lpaQuestionnaire.create.inConservationArea, false);
		assert.strictEqual(result.lpaQuestionnaire.create.affectsScheduledMonument, false);
		assert.strictEqual(result.lpaQuestionnaire.create.isAonbNationalLandscape, true);
		assert.strictEqual(result.lpaQuestionnaire.create.hasProtectedSpecies, false);
		assert.strictEqual(result.lpaQuestionnaire.create.hasInfrastructureLevy, true);
		assert.strictEqual(result.lpaQuestionnaire.create.isInfrastructureLevyFormallyAdopted, false);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaCostsAppliedFor, true);
		assert.strictEqual(result.lpaQuestionnaire.create.isSiteInAreaOfSpecialControlAdverts, false);
		assert.strictEqual(result.lpaQuestionnaire.create.wasApplicationRefusedDueToHighwayOrTraffic, true);
		assert.strictEqual(result.lpaQuestionnaire.create.didAppellantSubmitCompletePhotosAndPlans, false);
	});

	test('maps infrastructure levy dates', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			infrastructureLevyAdoptedDate: '2023-06-01T00:00:00.000Z',
			infrastructureLevyExpectedDate: '2025-01-01T00:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(
			result.lpaQuestionnaire.create.lpaQuestionnaireSubmittedDate?.toISOString(),
			'2024-02-10T10:00:00.000Z'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.infrastructureLevyAdoptedDate?.toISOString(),
			'2023-06-01T00:00:00.000Z'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.infrastructureLevyExpectedDate?.toISOString(),
			'2025-01-01T00:00:00.000Z'
		);
	});

	test('maps costs and recovery dates', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			dateCostsReportDespatched: '2024-03-01T00:00:00.000Z',
			dateNotRecoveredOrDerecovered: '2024-03-05T00:00:00.000Z',
			dateRecovered: '2024-03-10T00:00:00.000Z',
			originalCaseDecisionDate: '2023-12-01T00:00:00.000Z',
			targetDate: '2024-06-01T00:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(
			result.lpaQuestionnaire.create.dateCostsReportDespatched?.toISOString(),
			'2024-03-01T00:00:00.000Z'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.dateNotRecoveredOrDerecovered?.toISOString(),
			'2024-03-05T00:00:00.000Z'
		);
		assert.strictEqual(result.lpaQuestionnaire.create.dateRecovered?.toISOString(), '2024-03-10T00:00:00.000Z');
		assert.strictEqual(
			result.lpaQuestionnaire.create.originalCaseDecisionDate?.toISOString(),
			'2023-12-01T00:00:00.000Z'
		);
		assert.strictEqual(result.lpaQuestionnaire.create.targetDate?.toISOString(), '2024-06-01T00:00:00.000Z');
	});

	test('maps string fields', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaStatement: 'LPA statement text',
			newConditionDetails: 'New condition details',
			siteAccessDetails: 'Site access info',
			siteSafetyDetails: 'Safety info',
			lpaProcedurePreference: 'hearing',
			lpaProcedurePreferenceDetails: 'Preference details',
			reasonForNeighbourVisits: 'Reason text',
			importantInformation: 'Important info'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaStatement, 'LPA statement text');
		assert.strictEqual(result.lpaQuestionnaire.create.newConditionDetails, 'New condition details');
		assert.strictEqual(result.lpaQuestionnaire.create.siteAccessDetails, 'Site access info');
		assert.strictEqual(result.lpaQuestionnaire.create.siteSafetyDetails, 'Safety info');
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreference, 'hearing');
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreferenceDetails, 'Preference details');
		assert.strictEqual(result.lpaQuestionnaire.create.reasonForNeighbourVisits, 'Reason text');
		assert.strictEqual(result.lpaQuestionnaire.create.importantInformation, 'Important info');
	});

	test('maps lpaProcedurePreference old values', () => {
		const source = {
			...mockAppealHasCase,
			lpaProcedurePreference: 'LI'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreference, APPEAL_CASE_PROCEDURE.INQUIRY);
	});

	test('creates lpaQuestionnaire when only a boolean field is set', () => {
		const source = {
			...mockAppealHasCase,
			isCorrectAppealType: true
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.isCorrectAppealType, true);
	});

	test('maps redeterminedIndicator true as boolean and coerces to string', () => {
		const source = { ...mockAppealHasCase, redeterminedIndicator: true };
		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.redeterminedIndicator, 'true');
	});

	test('maps redeterminedIndicator false as boolean and does not drop it', () => {
		const source = { ...mockAppealHasCase, redeterminedIndicator: false };
		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.redeterminedIndicator, 'false');
	});

	test('omits redeterminedIndicator when null', () => {
		const source = { ...mockAppealHasCase, redeterminedIndicator: null };
		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.strictEqual(result.lpaQuestionnaire, undefined);
	});

	test('maps affectedListedBuildingNumbers JSON array to listedBuildingDetails array', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			affectedListedBuildingNumbers: '["1234567","7654321"]'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.listedBuildingDetails);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create.length, 2);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[0].listEntry, '1234567');
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[0].affectsListedBuilding, true);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[1].listEntry, '7654321');
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[1].affectsListedBuilding, true);
	});

	test('omits listedBuildingDetails when affectedListedBuildingNumbers is null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			affectedListedBuildingNumbers: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails, undefined);
	});

	test('omits lpaCostsAppliedFor when null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaCostsAppliedFor: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaCostsAppliedFor, undefined);
	});

	test('maps designatedSitesNames JSON array to designatedSiteNames relation', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			designatedSitesNames: '["site-a","site-b"]'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.designatedSiteNames);
		assert.strictEqual(result.lpaQuestionnaire.create.designatedSiteNames.create.length, 2);
		assert.strictEqual(
			result.lpaQuestionnaire.create.designatedSiteNames.create[0].designatedSite.connect.key,
			'site-a'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.designatedSiteNames.create[1].designatedSite.connect.key,
			'site-b'
		);
	});

	test('omits designatedSiteNames when designatedSitesNames is null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			designatedSitesNames: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.designatedSiteNames, undefined);
	});

	test('maps lpaQuestionnaireValidationDetails to lpaQuestionnaireIncompleteReasonsSelected', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireValidationDetails: '["Missing documents", "Incorrect fee: Wrong amount"]'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.lpaQuestionnaireIncompleteReasonsSelected);
		const selected = result.lpaQuestionnaire.create.lpaQuestionnaireIncompleteReasonsSelected.create;
		assert.strictEqual(selected.length, 2);

		// First reason without text
		assert.strictEqual(selected[0].lpaQuestionnaireIncompleteReason.connect.id, 1);
		assert.strictEqual(selected[0].lpaQuestionnaireIncompleteReasonText, undefined);

		// Second reason with text
		assert.strictEqual(selected[1].lpaQuestionnaireIncompleteReason.connect.id, 2);
		assert.ok(selected[1].lpaQuestionnaireIncompleteReasonText);
		assert.strictEqual(selected[1].lpaQuestionnaireIncompleteReasonText.create[0].text, 'Wrong amount');
	});

	test('omits lpaQuestionnaireIncompleteReasonsSelected when lpaQuestionnaireValidationDetails is null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireValidationDetails: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaQuestionnaireIncompleteReasonsSelected, undefined);
	});

	test('maps S78 enforcement fields', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			noticeRelatesToBuildingEngineeringMiningOther: true,
			areaOfAllegedBreachInSquareMetres: new Prisma.Decimal(500.25),
			doesAllegedBreachCreateFloorSpace: true,
			floorSpaceCreatedByBreachInSquareMetres: new Prisma.Decimal(200.75),
			changeOfUseRefuseOrWaste: true,
			changeOfUseMineralExtraction: false,
			changeOfUseMineralStorage: true,
			relatesToErectionOfBuildingOrBuildings: false,
			relatesToBuildingWithAgriculturalPurpose: true,
			relatesToBuildingSingleDwellingHouse: false,
			affectedTrunkRoadName: 'M1',
			isSiteOnCrownLand: true,
			article4AffectedDevelopmentRights: 'Article 4 direction'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.strictEqual(result.lpaQuestionnaire.create.noticeRelatesToBuildingEngineeringMiningOther, true);
		assert.strictEqual(result.lpaQuestionnaire.create.areaOfAllegedBreachInSquareMetres, 500.25);
		assert.strictEqual(result.lpaQuestionnaire.create.doesAllegedBreachCreateFloorSpace, true);
		assert.strictEqual(result.lpaQuestionnaire.create.floorSpaceCreatedByBreachInSquareMetres, 200.75);
		assert.strictEqual(result.lpaQuestionnaire.create.changeOfUseRefuseOrWaste, true);
		assert.strictEqual(result.lpaQuestionnaire.create.changeOfUseMineralExtraction, false);
		assert.strictEqual(result.lpaQuestionnaire.create.changeOfUseMineralStorage, true);
		assert.strictEqual(result.lpaQuestionnaire.create.relatesToErectionOfBuildingOrBuildings, false);
		assert.strictEqual(result.lpaQuestionnaire.create.relatesToBuildingWithAgriculturalPurpose, true);
		assert.strictEqual(result.lpaQuestionnaire.create.relatesToBuildingSingleDwellingHouse, false);
		assert.strictEqual(result.lpaQuestionnaire.create.affectedTrunkRoadName, 'M1');
		assert.strictEqual(result.lpaQuestionnaire.create.isSiteOnCrownLand, true);
		assert.strictEqual(result.lpaQuestionnaire.create.article4AffectedDevelopmentRights, 'Article 4 direction');
	});

	test('maps S78 date fields', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			siteNoticesSentDate: '2024-01-15T00:00:00.000Z',
			originalCaseDecisionDate: '2024-01-20T00:00:00.000Z',
			targetDate: '2024-03-01T00:00:00.000Z',
			dateCostsReportDespatched: '2024-02-01T00:00:00.000Z',
			dateNotRecoveredOrDerecovered: '2024-02-05T00:00:00.000Z',
			dateRecovered: '2024-02-10T00:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.strictEqual(result.lpaQuestionnaire.create.siteNoticesSentDate?.toISOString(), '2024-01-15T00:00:00.000Z');
		assert.strictEqual(
			result.lpaQuestionnaire.create.originalCaseDecisionDate?.toISOString(),
			'2024-01-20T00:00:00.000Z'
		);
		assert.strictEqual(result.lpaQuestionnaire.create.targetDate?.toISOString(), '2024-03-01T00:00:00.000Z');
		assert.strictEqual(
			result.lpaQuestionnaire.create.dateCostsReportDespatched?.toISOString(),
			'2024-02-01T00:00:00.000Z'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.dateNotRecoveredOrDerecovered?.toISOString(),
			'2024-02-05T00:00:00.000Z'
		);
		assert.strictEqual(result.lpaQuestionnaire.create.dateRecovered?.toISOString(), '2024-02-10T00:00:00.000Z');
	});

	test('maps S78 string fields', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			importantInformation: 'Important site information',
			reasonForNeighbourVisits: 'Neighbour consultation required',
			redeterminedIndicator: 'Y'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.strictEqual(result.lpaQuestionnaire.create.importantInformation, 'Important site information');
		assert.strictEqual(result.lpaQuestionnaire.create.reasonForNeighbourVisits, 'Neighbour consultation required');
		assert.strictEqual(result.lpaQuestionnaire.create.redeterminedIndicator, 'Y');
	});

	test('maps S20 and LDC fields', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			preserveGrantLoan: true,
			consultHistoricEngland: true,
			typeOfPlanningApplication: 'Householder'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.strictEqual(result.lpaQuestionnaire.create.preserveGrantLoan, true);
		assert.strictEqual(result.lpaQuestionnaire.create.historicEnglandConsultation, true);
	});

	test('handles null S78 fields gracefully', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			isGypsyOrTravellerSite: null,
			isPublicRightOfWay: null,
			siteWithinSSSI: null,
			eiaEnvironmentalImpactSchedule: null,
			eiaDevelopmentDescription: null,
			eiaSensitiveAreaDetails: null,
			eiaColumnTwoThreshold: null,
			eiaScreeningOpinion: null,
			eiaRequiresEnvironmentalStatement: null,
			eiaCompletedEnvironmentalStatement: null,
			hasStatutoryConsultees: null,
			consultedBodiesDetails: null,
			lpaProcedurePreference: null,
			lpaProcedurePreferenceDetails: null,
			lpaProcedurePreferenceDuration: null,
			noticeRelatesToBuildingEngineeringMiningOther: null,
			areaOfAllegedBreachInSquareMetres: null,
			doesAllegedBreachCreateFloorSpace: null,
			floorSpaceCreatedByBreachInSquareMetres: null,
			changeOfUseRefuseOrWaste: null,
			changeOfUseMineralExtraction: null,
			changeOfUseMineralStorage: null,
			relatesToErectionOfBuildingOrBuildings: null,
			relatesToBuildingWithAgriculturalPurpose: null,
			relatesToBuildingSingleDwellingHouse: null,
			affectedTrunkRoadName: null,
			isSiteOnCrownLand: null,
			article4AffectedDevelopmentRights: null,
			siteNoticesSentDate: null,
			originalCaseDecisionDate: null,
			targetDate: null,
			dateCostsReportDespatched: null,
			dateNotRecoveredOrDerecovered: null,
			dateRecovered: null,
			importantInformation: null,
			reasonForNeighbourVisits: null,
			redeterminedIndicator: null,
			preserveGrantLoan: null,
			consultHistoricEngland: null,
			typeOfPlanningApplication: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		// Boolean fields should be undefined when null
		assert.strictEqual(result.lpaQuestionnaire.create.isGypsyOrTravellerSite, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.isPublicRightOfWay, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.siteWithinSSSI, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.eiaColumnTwoThreshold, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.eiaScreeningOpinion, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.eiaRequiresEnvironmentalStatement, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.eiaCompletedEnvironmentalStatement, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.hasStatutoryConsultees, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.doesAllegedBreachCreateFloorSpace, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.noticeRelatesToBuildingEngineeringMiningOther, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.changeOfUseRefuseOrWaste, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.changeOfUseMineralExtraction, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.changeOfUseMineralStorage, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.relatesToErectionOfBuildingOrBuildings, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.relatesToBuildingWithAgriculturalPurpose, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.relatesToBuildingSingleDwellingHouse, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.isSiteOnCrownLand, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.preserveGrantLoan, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.historicEnglandConsultation, undefined);

		// String fields should be undefined when null
		assert.strictEqual(result.lpaQuestionnaire.create.eiaEnvironmentalImpactSchedule, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.eiaDevelopmentDescription, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.eiaSensitiveAreaDetails, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.consultedBodiesDetails, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreference, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreferenceDetails, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.affectedTrunkRoadName, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.article4AffectedDevelopmentRights, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.importantInformation, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.reasonForNeighbourVisits, undefined);

		// Number fields should be undefined when null
		assert.strictEqual(result.lpaQuestionnaire.create.areaOfAllegedBreachInSquareMetres, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.floorSpaceCreatedByBreachInSquareMetres, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreferenceDuration, undefined);

		// Date fields should be undefined when null
		assert.strictEqual(result.lpaQuestionnaire.create.siteNoticesSentDate, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.originalCaseDecisionDate, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.targetDate, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.dateCostsReportDespatched, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.dateNotRecoveredOrDerecovered, undefined);
		assert.strictEqual(result.lpaQuestionnaire.create.dateRecovered, undefined);

		// String fields that should be undefined when null
		assert.strictEqual(result.lpaQuestionnaire.create.redeterminedIndicator, undefined);
	});

	test('throws error for unknown lpaQuestionnaire incomplete reason', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireValidationDetails: '["Unknown reason that does not exist"]'
		};

		assert.throws(() => mapSourceToSinkAppeal(source, mockValidationReasonLookups), {
			message: /Unknown lpaquestionnairevalidationdetails reason: "Unknown reason that does not exist"/
		});
	});
});

describe('mapSourceToSinkAppeal - AppealS78 Appellant Case Fields', () => {
	test('maps S78 enforcement fields', () => {
		const source = {
			...mockAppealHasCase,
			issueDateOfEnforcementNotice: '2024-01-10T00:00:00.000Z',
			effectiveDateOfEnforcementNotice: '2024-01-20T00:00:00.000Z',
			enforcementNoticeReference: 'ENF/2024/001',
			descriptionOfAllegedBreach: 'Unauthorized building works',
			dateAppellantContactedPins: '2024-01-15T00:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;
		assert.strictEqual(appellantCase.enforcementIssueDate?.toISOString(), '2024-01-10T00:00:00.000Z');
		assert.strictEqual(appellantCase.enforcementEffectiveDate?.toISOString(), '2024-01-20T00:00:00.000Z');
		assert.strictEqual(appellantCase.enforcementReference, 'ENF/2024/001');
		assert.strictEqual(appellantCase.descriptionOfAllegedBreach, 'Unauthorized building works');
		assert.strictEqual(appellantCase.contactPlanningInspectorateDate?.toISOString(), '2024-01-15T00:00:00.000Z');
	});

	test('maps S78 appeal decision date', () => {
		const source = {
			...mockAppealHasCase,
			dateLpaDecisionReceived: '2024-02-15T00:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;
		assert.strictEqual(appellantCase.appealDecisionDate?.toISOString(), '2024-02-15T00:00:00.000Z');
	});

	test('maps S78 didAppellantAppealLpaDecision', () => {
		const source = {
			...mockAppealHasCase,
			didAppellantAppealLpaDecision: true
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;
		assert.strictEqual(appellantCase.applicationDecisionAppealed, true);
	});

	test('maps S78 land ownership and permission fields', () => {
		const source = {
			...mockAppealHasCase,
			ownerOccupancyStatus: 'Owner',
			occupancyConditionsMet: true
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;
		assert.strictEqual(appellantCase.interestInLand, 'Owner');
		assert.strictEqual(appellantCase.writtenOrVerbalPermission, 'yes');
	});

	test('converts occupancyConditionsMet false to no', () => {
		const source = {
			...mockAppealHasCase,
			occupancyConditionsMet: false
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		assert.strictEqual(result.appellantCase.create.writtenOrVerbalPermission, 'no');
	});

	test('preserves null for occupancyConditionsMet', () => {
		const source = {
			...mockAppealHasCase,
			occupancyConditionsMet: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		assert.strictEqual(result.appellantCase.create.writtenOrVerbalPermission, undefined);
	});

	test('maps S78 procedure preference fields', () => {
		const source = {
			...mockAppealHasCase,
			appellantProcedurePreference: 'hearing',
			appellantProcedurePreferenceDetails: 'Prefer hearing due to complexity',
			appellantProcedurePreferenceDuration: new Prisma.Decimal(5),
			appellantProcedurePreferenceWitnessCount: new Prisma.Decimal(3)
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;
		assert.strictEqual(appellantCase.appellantProcedurePreference, 'hearing');
		assert.strictEqual(appellantCase.appellantProcedurePreferenceDetails, 'Prefer hearing due to complexity');
		assert.strictEqual(appellantCase.appellantProcedurePreferenceDuration, 5);
		assert.strictEqual(appellantCase.appellantProcedurePreferenceWitnessCount, 3);
	});

	test('maps S78 agricultural holding fields', () => {
		const source = {
			...mockAppealHasCase,
			agriculturalHolding: true,
			tenantAgriculturalHolding: true,
			otherTenantsAgriculturalHolding: false,
			informedTenantsAgriculturalHolding: true
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;
		assert.strictEqual(appellantCase.agriculturalHolding, true);
		assert.strictEqual(appellantCase.tenantAgriculturalHolding, true);
		assert.strictEqual(appellantCase.otherTenantsAgriculturalHolding, false);
		assert.strictEqual(appellantCase.informedTenantsAgriculturalHolding, true);
	});

	test('maps S78 planning and development fields', () => {
		const source = {
			...mockAppealHasCase,
			statusPlanningObligation: 'Completed',
			applicationMadeAndFeePaid: true,
			applicationPartOrWholeDevelopment: 'whole',
			developmentType: 'residential',
			numberOfResidencesNetChange: new Prisma.Decimal(5),
			siteViewableFromRoad: true
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;
		assert.strictEqual(appellantCase.statusPlanningObligation, 'Completed');
		assert.strictEqual(appellantCase.applicationMadeAndFeePaid, true);
		assert.strictEqual(appellantCase.applicationDevelopmentAllOrPart, 'whole');
		assert.strictEqual(appellantCase.developmentType, 'residential');
		assert.strictEqual(appellantCase.numberOfResidencesNetChange, 5);
		assert.strictEqual(appellantCase.siteViewableFromRoad, true);
	});

	test('handles null S78 fields gracefully', () => {
		const source = {
			...mockAppealHasCase,
			issueDateOfEnforcementNotice: null,
			effectiveDateOfEnforcementNotice: null,
			ownerOccupancyStatus: null,
			occupancyConditionsMet: null,
			appellantProcedurePreference: null,
			appellantProcedurePreferenceDetails: null,
			appellantProcedurePreferenceDuration: null,
			appellantProcedurePreferenceWitnessCount: null,
			statusPlanningObligation: null,
			agriculturalHolding: null,
			tenantAgriculturalHolding: null,
			otherTenantsAgriculturalHolding: null,
			informedTenantsAgriculturalHolding: null,
			didAppellantAppealLpaDecision: null,
			enforcementNoticeReference: null,
			descriptionOfAllegedBreach: null,
			dateAppellantContactedPins: null,
			applicationMadeAndFeePaid: null,
			applicationPartOrWholeDevelopment: null,
			developmentType: null,
			numberOfResidencesNetChange: null,
			siteViewableFromRoad: null,
			dateLpaDecisionReceived: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appellantCase);
		const appellantCase = result.appellantCase.create;
		assert.strictEqual(appellantCase.enforcementIssueDate, undefined);
		assert.strictEqual(appellantCase.enforcementEffectiveDate, undefined);
		assert.strictEqual(appellantCase.interestInLand, undefined);
		assert.strictEqual(appellantCase.writtenOrVerbalPermission, undefined);
		assert.strictEqual(appellantCase.appellantProcedurePreference, undefined);
		assert.strictEqual(appellantCase.agriculturalHolding, null);
		assert.strictEqual(appellantCase.tenantAgriculturalHolding, null);
		assert.strictEqual(appellantCase.otherTenantsAgriculturalHolding, null);
		assert.strictEqual(appellantCase.informedTenantsAgriculturalHolding, null);
		assert.strictEqual(appellantCase.applicationDecisionAppealed, null);
		assert.strictEqual(appellantCase.applicationMadeAndFeePaid, null);
		assert.strictEqual(appellantCase.enforcementReference, undefined);
		assert.strictEqual(appellantCase.descriptionOfAllegedBreach, undefined);
		assert.strictEqual(appellantCase.contactPlanningInspectorateDate, undefined);
		assert.strictEqual(appellantCase.applicationDevelopmentAllOrPart, undefined);
		assert.strictEqual(appellantCase.developmentType, undefined);
		assert.strictEqual(appellantCase.siteViewableFromRoad, null);
		assert.strictEqual(appellantCase.appealDecisionDate, undefined);
	});
});
describe('mapSourceToSinkAppeal - S78 Additional Field Mappings', () => {
	test('maps S78 timetable fields to AppealTimetable', () => {
		const source = {
			...mockAppealHasCase,
			planningObligationDueDate: '2024-03-01T09:00:00.000Z',
			finalCommentsDueDate: '2024-03-05T17:00:00.000Z',
			interestedPartyRepsDueDate: '2024-03-10T17:00:00.000Z',
			proofsOfEvidenceDueDate: '2024-03-15T17:00:00.000Z',
			statementDueDate: '2024-03-20T17:00:00.000Z',
			statementOfCommonGroundDueDate: '2024-03-25T17:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appealTimetable);
		const timetable = result.appealTimetable.create;
		assert.strictEqual(timetable.planningObligationDueDate?.toISOString(), '2024-03-01T09:00:00.000Z');
		assert.strictEqual(timetable.finalCommentsDueDate?.toISOString(), '2024-03-05T17:00:00.000Z');
		assert.strictEqual(timetable.ipCommentsDueDate?.toISOString(), '2024-03-10T17:00:00.000Z');
		assert.strictEqual(timetable.proofOfEvidenceAndWitnessesDueDate?.toISOString(), '2024-03-15T17:00:00.000Z');
		assert.strictEqual(timetable.lpaStatementDueDate?.toISOString(), '2024-03-20T17:00:00.000Z');
		assert.strictEqual(timetable.statementOfCommonGroundDueDate?.toISOString(), '2024-03-25T17:00:00.000Z');
	});

	test('omits AppealTimetable when no timetable dates exist', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireDueDate: null,
			planningObligationDueDate: null,
			finalCommentsDueDate: null,
			interestedPartyRepsDueDate: null,
			proofsOfEvidenceDueDate: null,
			statementDueDate: null,
			statementOfCommonGroundDueDate: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.strictEqual(result.appealTimetable, undefined);
	});

	test('maps changedListedBuildingNumbers to listedBuildingDetails with affectsListedBuilding true', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			affectedListedBuildingNumbers: '["1234567"]',
			changedListedBuildingNumbers: '["7654321","9876543"]'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.listedBuildingDetails);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create.length, 3);

		// affected building (relies on database default affectsListedBuilding: true)
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[0].listEntry, '1234567');

		// changed buildings (explicit affectsListedBuilding: true)
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[1].listEntry, '7654321');
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[1].affectsListedBuilding, true);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[2].listEntry, '9876543');
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create[2].affectsListedBuilding, true);
	});

	test('maps representation dates to Representation records', () => {
		const source = {
			...mockAppealHasCase,
			appellantCommentsSubmittedDate: '2024-02-01T10:00:00.000Z',
			appellantStatementSubmittedDate: '2024-02-02T11:00:00.000Z',
			appellantProofsSubmittedDate: '2024-02-03T12:00:00.000Z',
			lpaCommentsSubmittedDate: '2024-02-04T13:00:00.000Z',
			lpaProofsSubmittedDate: '2024-02-05T14:00:00.000Z',
			lpaStatementSubmittedDate: '2024-02-06T15:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.representations);
		assert.strictEqual(result.representations.create.length, 6);

		const [appellantFinalComment, appellantStatement, appellantProofs, lpaFinalComment, lpaProofs, lpaStatement] =
			result.representations.create;

		assert.strictEqual(appellantFinalComment.representationType, 'appellant_final_comment');
		assert.strictEqual(appellantFinalComment.dateCreated.toISOString(), '2024-02-01T10:00:00.000Z');

		assert.strictEqual(appellantStatement.representationType, 'appellant_statement');
		assert.strictEqual(appellantStatement.dateCreated.toISOString(), '2024-02-02T11:00:00.000Z');

		assert.strictEqual(appellantProofs.representationType, 'appellant_proofs_evidence');
		assert.strictEqual(appellantProofs.dateCreated.toISOString(), '2024-02-03T12:00:00.000Z');

		assert.strictEqual(lpaFinalComment.representationType, 'lpa_final_comment');
		assert.strictEqual(lpaFinalComment.dateCreated.toISOString(), '2024-02-04T13:00:00.000Z');

		assert.strictEqual(lpaProofs.representationType, 'lpa_proofs_evidence');
		assert.strictEqual(lpaProofs.dateCreated.toISOString(), '2024-02-05T14:00:00.000Z');

		assert.strictEqual(lpaStatement.representationType, 'lpa_statement');
		assert.strictEqual(lpaStatement.dateCreated.toISOString(), '2024-02-06T15:00:00.000Z');
	});

	test('omits representations when no representation dates exist', () => {
		const source = {
			...mockAppealHasCase,
			appellantCommentsSubmittedDate: null,
			appellantStatementSubmittedDate: null,
			appellantProofsSubmittedDate: null,
			lpaCommentsSubmittedDate: null,
			lpaProofsSubmittedDate: null,
			lpaStatementSubmittedDate: null
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.strictEqual(result.representations, undefined);
	});

	test('maps enforcementAppealGroundsDetails to AppealGround records', () => {
		const source = {
			...mockAppealHasCase,
			enforcementAppealGroundsDetails:
				'[{"appealGroundLetter":"a","groundFacts":"Ground A facts"},{"appealGroundLetter":"b","groundFacts":"Ground B facts"},{"appealGroundLetter":null,"groundFacts":"No letter"}]'
		};

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups);

		assert.ok(result.appealGrounds);
		assert.strictEqual(result.appealGrounds.create.length, 2);

		const groundA = result.appealGrounds.create.find((g) => g.ground.connect.groundRef === 'a');
		const groundB = result.appealGrounds.create.find((g) => g.ground.connect.groundRef === 'b');

		assert.ok(groundA);
		assert.strictEqual(groundA.factsForGround, 'Ground A facts');
		assert.ok(groundB);
		assert.strictEqual(groundB.factsForGround, 'Ground B facts');
	});

	test('merges interested party representations with existing representations (does not overwrite)', () => {
		const source = {
			...mockAppealHasCase,
			caseReference: 'CASE-017',
			appellantCommentsSubmittedDate: '2024-02-01T10:00:00.000Z',
			appellantStatementSubmittedDate: '2024-02-02T11:00:00.000Z',
			appellantProofsSubmittedDate: '2024-02-03T12:00:00.000Z',
			lpaCommentsSubmittedDate: '2024-02-04T13:00:00.000Z',
			lpaProofsSubmittedDate: '2024-02-05T14:00:00.000Z',
			lpaStatementSubmittedDate: '2024-02-06T15:00:00.000Z'
		};

		const serviceUsers = [
			{
				firstName: 'Alice',
				emailAddress: 'interested@example.com',
				serviceUserType: 'InterestedParty',
				caseReference: 'CASE-017'
			}
		];

		const result = mapSourceToSinkAppeal(source, mockValidationReasonLookups, undefined, serviceUsers);

		assert.ok(result.representations);
		assert.ok(result.representations.create);
		assert.ok(Array.isArray(result.representations.create));

		assert.strictEqual(result.representations.create.length, 7);

		const appellantFinalComment = result.representations.create.find(
			(r) => r.representationType === 'appellant_final_comment'
		);
		assert.ok(appellantFinalComment);

		const interestedPartyRep = result.representations.create.find((r) => r.represented?.create?.firstName === 'Alice');
		assert.ok(interestedPartyRep);
	});

	test('omits appealGrounds when enforcementAppealGroundsDetails is null or empty', () => {
		const sourceNull = {
			...mockAppealHasCase,
			enforcementAppealGroundsDetails: null
		};

		const sourceEmpty = {
			...mockAppealHasCase,
			enforcementAppealGroundsDetails: '[]'
		};

		const resultNull = mapSourceToSinkAppeal(sourceNull, mockValidationReasonLookups);
		const resultEmpty = mapSourceToSinkAppeal(sourceEmpty, mockValidationReasonLookups);

		assert.strictEqual(resultNull.appealGrounds, undefined);
		assert.strictEqual(resultEmpty.appealGrounds, undefined);
	});
});

describe('mapSourceToSinkAppeal - Folders', () => {
	test('creates all default folders for every case', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		assert.ok(result.folders);
		assert.strictEqual(result.folders.create.length, FOLDERS.length);
	});

	test('folder paths match the FOLDERS constant exactly', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		const createdPaths = result.folders.create.map((f) => f.path);
		assert.deepStrictEqual(createdPaths, FOLDERS);
	});

	test('includes representation/representationAttachments folder', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase, mockValidationReasonLookups);

		const paths = result.folders.create.map((f) => f.path);
		assert.ok(paths.includes('representation/representationAttachments'));
	});

	test('folders are always created regardless of source case data', () => {
		const minimalCase = MockCases.mockCaseWithNullDates;
		const result = mapSourceToSinkAppeal(minimalCase, mockValidationReasonLookups);

		assert.ok(result.folders);
		assert.strictEqual(result.folders.create.length, FOLDERS.length);
	});
});
