// @ts-nocheck
import { Decimal } from '@pins/odw-curated-database/src/client/internal/prismaNamespace.ts';
import { APPEAL_CASE_STATUS } from '@planning-inspectorate/data-model';
import assert from 'node:assert';
import { describe, test } from 'node:test';
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

describe('mapSourceToSinkAppeal - Appeal Mapping', () => {
	test('throws error for missing required fields', () => {
		assert.throws(() => mapSourceToSinkAppeal(MockCases.mockCaseWithoutReference), /caseReference is required/);
		assert.throws(() => mapSourceToSinkAppeal(MockCases.mockCaseWithoutLpaCode), /lpaCode is required/);
	});

	test('maps basic identification fields', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.strictEqual(result.reference, 'APP/HAS/2024/001');
		assert.strictEqual(result.submissionId, undefined);
		assert.strictEqual(result.applicationReference, 'APP-2024-001');
	});

	test('maps core date fields', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.ok(result.caseCreatedDate instanceof Date);
		assert.ok(result.caseUpdatedDate instanceof Date);
		assert.ok(result.caseValidDate instanceof Date);
		assert.ok(result.caseStartedDate instanceof Date);
		assert.strictEqual(result.caseExtensionDate, undefined);
		assert.ok(result.casePublishedDate instanceof Date);
		assert.strictEqual(result.caseCompletedDate, undefined);
	});

	test('maps lookup relations', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.ok(result.appealType);
		assert.strictEqual(result.appealType.connect.key, 'D');

		assert.ok(result.procedureType);
		assert.strictEqual(result.procedureType.connect.key, 'written');

		assert.ok(result.lpa);
		assert.strictEqual(result.lpa.connect.lpaCode, 'Q9999');
	});

	test('maps user assignments with connectOrCreate', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.ok(result.caseOfficer);
		assert.strictEqual(result.caseOfficer.connectOrCreate.where.azureAdUserId, 'officer-123');
		assert.strictEqual(result.caseOfficer.connectOrCreate.create.azureAdUserId, 'officer-123');

		assert.ok(result.inspector);
		assert.strictEqual(result.inspector.connectOrCreate.where.azureAdUserId, 'inspector-456');

		assert.strictEqual(result.padsInspector, undefined);
	});

	test('maps allocation details', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.ok(result.allocation);
		assert.strictEqual(result.allocation.create.level, 'A');
		assert.strictEqual(result.allocation.create.band, 1);
	});

	test('maps appeal status with createdAt timestamp', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.ok(result.appealStatus);
		assert.ok(result.appealStatus.create.length >= 1);

		// First status should be the current status
		const currentStatus = result.appealStatus.create.find((s) => s.valid === true);
		assert.ok(currentStatus);
		assert.strictEqual(currentStatus.status, 'ready_to_start');
		assert.ok(currentStatus.createdAt instanceof Date);
	});

	test('creates multiple appeal statuses based on available dates', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithMultipleStatuses);

		assert.ok(result.appealStatus);
		assert.strictEqual(result.appealStatus.create.length, 4);

		// Should have current status (valid=true)
		const validStatus = result.appealStatus.create.filter((s) => s.valid === true);
		assert.strictEqual(validStatus.length, 1);

		// Should have historical statuses (valid=false)
		const historicalStatuses = result.appealStatus.create.filter((s) => s.valid === false);
		assert.strictEqual(historicalStatuses.length, 3);

		// Check for READY_TO_START status
		const readyToStartStatus = result.appealStatus.create.find((s) => s.status === APPEAL_CASE_STATUS.READY_TO_START);
		assert.ok(readyToStartStatus);
		assert.strictEqual(readyToStartStatus.valid, false);

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
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.ok(result.specialisms);
		assert.strictEqual(result.specialisms.create.length, 2);
		assert.strictEqual(result.specialisms.create[0].specialism.connectOrCreate.where.name, 'Access');
		assert.strictEqual(result.specialisms.create[1].specialism.connectOrCreate.where.name, 'Listed building');
	});

	test('maps address fields', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.ok(result.address);
		assert.strictEqual(result.address.create.addressLine1, '123 Main Street');
		assert.strictEqual(result.address.create.addressTown, 'London');
		assert.strictEqual(result.address.create.addressCounty, 'Greater London');
		assert.strictEqual(result.address.create.postcode, 'SW1A 1AA');
	});

	test('maps appeal timetable', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.ok(result.appealTimetable);
		assert.ok(result.appealTimetable.create.lpaQuestionnaireDueDate instanceof Date);
		assert.ok(result.appealTimetable.create.caseResubmissionDueDate instanceof Date);
	});

	test('does not create appeal timetable when both dates are null', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullTimetable);

		assert.strictEqual(result.appealTimetable, undefined);
	});

	test('maps inspector decision when outcome exists', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithDecision);

		assert.ok(result.inspectorDecision);
		assert.strictEqual(result.inspectorDecision.create.outcome, 'allowed');
		assert.ok(result.inspectorDecision.create.caseDecisionOutcomeDate instanceof Date);
	});

	test('handles nearby case references', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithReferences);

		assert.ok(result.childAppeals);
		assert.strictEqual(result.childAppeals.create.length, 2);
		assert.strictEqual(result.childAppeals.create[0].type, 'related');
		assert.strictEqual(result.childAppeals.create[0].parentRef, 'APP/HAS/2024/001');
		assert.strictEqual(result.childAppeals.create[0].childRef, 'APP/2024/100');
	});

	test('handles optional fields gracefully', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		// These should be undefined when source data is null
		assert.strictEqual(result.submissionId, undefined);
		assert.strictEqual(result.caseExtensionDate, undefined);
		assert.strictEqual(result.caseCompletedDate, undefined);
		assert.ok(result.address);
		assert.strictEqual(result.childAppeals, undefined);
		assert.strictEqual(result.neighbouringSites, undefined);
	});

	test('handles padsSapId null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullPads);

		assert.strictEqual(result.padsInspector, undefined);
	});

	test('handles padsSapId with value', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithPads);

		assert.ok(result.padsInspector);
		assert.strictEqual(result.padsInspector.connectOrCreate.where.sapId, 'SAP-123');
	});

	test('handles caseOfficer null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullOfficer);

		assert.strictEqual(result.caseOfficer, undefined);
	});

	test('handles inspector null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullInspector);

		assert.strictEqual(result.inspector, undefined);
	});

	test('handles allocation null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullAllocation);

		assert.strictEqual(result.allocation, undefined);
	});

	test('handles specialisms null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullSpecialisms);

		assert.strictEqual(result.specialisms, undefined);
	});

	test('handles inspector decision null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullDecision);

		assert.strictEqual(result.inspectorDecision, undefined);
	});

	test('handles caseWithdrawnDate null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullWithdrawn);

		// Should not have WITHDRAWN status
		const withdrawnStatus = result.appealStatus?.create.find((s) => s.status === APPEAL_CASE_STATUS.WITHDRAWN);
		assert.strictEqual(withdrawnStatus, undefined);
	});

	test('handles caseType null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullType);

		assert.strictEqual(result.appealType, undefined);
	});

	test('handles caseProcedure null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullProcedure);

		assert.strictEqual(result.procedureType, undefined);
	});

	test('handles applicationReference null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullAppRef);

		assert.strictEqual(result.applicationReference, undefined);
	});

	test('handles date fields null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullDates);

		assert.strictEqual(result.caseCreatedDate, undefined);
		assert.strictEqual(result.caseUpdatedDate, undefined);
		assert.strictEqual(result.caseValidDate, undefined);
		assert.strictEqual(result.caseExtensionDate, undefined);
		assert.strictEqual(result.caseStartedDate, undefined);
		assert.strictEqual(result.casePublishedDate, undefined);
		assert.strictEqual(result.caseCompletedDate, undefined);
	});

	test('handles nearbyCaseReferences null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullReferences);

		assert.strictEqual(result.childAppeals, undefined);
	});

	test('handles neighbouringSiteAddresses null case', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNullNeighbours);

		assert.strictEqual(result.neighbouringSites, undefined);
	});

	test('maps appellant from service users', () => {
		const sourceCase = { caseReference: 'CASE-006', lpaCode: 'Q9999' };
		const serviceUsers = [{ ...mockAppellantServiceUser, caseReference: 'CASE-006' }];

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
		const sourceCase = { caseReference: 'CASE-007', lpaCode: 'Q9999' };
		const serviceUsers = [{ ...mockAgentServiceUser, caseReference: 'CASE-007' }];

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
		const sourceCase = { caseReference: 'CASE-008', lpaCode: 'Q9999' };
		const events = [mockHearingEvent];
		const serviceUsers = [{ ...mockAppellantServiceUser, caseReference: 'CASE-008' }];

		const result = mapSourceToSinkAppeal(sourceCase, events, serviceUsers);

		assert.strictEqual(result.reference, 'CASE-008');
		assert.ok(result.hearing?.create);
		assert.ok(result.appellant?.create);
		assert.strictEqual(result.appellant.create.firstName, 'John');
	});

	test('handles empty service users array', () => {
		const result = mapSourceToSinkAppeal({ caseReference: 'CASE-009', lpaCode: 'Q9999' }, undefined, []);

		assert.strictEqual(result.reference, 'CASE-009');
		assert.strictEqual(result.appellant, undefined);
		assert.strictEqual(result.agent, undefined);
	});

	test('throws error for duplicate service users', () => {
		const duplicateServiceUserCases = [
			{ type: 'appellant', users: mockDuplicateAppellants, expectedError: /Duplicate appellant/ },
			{ type: 'agent', users: mockDuplicateAgents, expectedError: /Duplicate agent/ }
		];

		duplicateServiceUserCases.forEach(({ type, users, expectedError }) => {
			assert.throws(
				() => mapSourceToSinkAppeal({ caseReference: 'CASE-010', lpaCode: 'Q9999' }, undefined, users),
				{ message: expectedError },
				`Should throw error for duplicate ${type}`
			);
		});
	});

	test('throws error for invalid JSON in specialisms', () => {
		assert.throws(() => mapSourceToSinkAppeal(MockCases.mockCaseWithInvalidJsonSpecialisms), {
			message: /Invalid JSON for specialisms/
		});
	});

	test('throws error for non-array JSON in specialisms', () => {
		assert.throws(() => mapSourceToSinkAppeal(MockCases.mockCaseWithNonArrayJsonSpecialisms), {
			message: /Expected JSON array for specialisms/
		});
	});

	test('handles neighbouring addresses as array input', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithArrayAddresses);

		assert.ok(result.neighbouringSites);
		assert.strictEqual(result.neighbouringSites.create.length, 2);
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressLine1, '123 Main St');
	});

	test('handles neighbouring addresses as empty array', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithEmptyArrayAddresses);

		assert.strictEqual(result.neighbouringSites, undefined);
	});

	test('throws error for invalid JSON in neighbouring addresses', () => {
		assert.throws(() => mapSourceToSinkAppeal(MockCases.mockCaseWithInvalidJsonAddresses), {
			message: /Invalid JSON for neighbouringSiteAddresses/
		});
	});

	test('throws error for non-array JSON in neighbouring addresses', () => {
		assert.throws(() => mapSourceToSinkAppeal(MockCases.mockCaseWithNonArrayJsonAddresses), {
			message: /Expected JSON array for neighbouringSiteAddresses/
		});
	});

	test('handles neighbouring addresses JSON with empty array', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithEmptyJsonArrayAddresses);

		assert.strictEqual(result.neighbouringSites, undefined);
	});

	test('maps allocation with populated values', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithAllocation);

		assert.ok(result.allocation);
		assert.strictEqual(result.allocation.create.level, 'C');
		assert.strictEqual(result.allocation.create.band, 2);
	});

	test('maps timetable with only lpaQuestionnaireDueDate', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithLpaDate);

		assert.ok(result.appealTimetable);
		assert.ok(result.appealTimetable.create.lpaQuestionnaireDueDate instanceof Date);
		assert.strictEqual(result.appealTimetable.create.caseResubmissionDueDate, undefined);
	});

	test('maps timetable with only caseSubmissionDueDate', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithSubmissionDate);

		assert.ok(result.appealTimetable);
		assert.strictEqual(result.appealTimetable.create.lpaQuestionnaireDueDate, undefined);
		assert.ok(result.appealTimetable.create.caseResubmissionDueDate instanceof Date);
	});

	test('maps caseExtensionDate when populated', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithExtension);

		assert.ok(result.caseExtensionDate instanceof Date);
	});

	test('creates COMPLETE status when caseCompletedDate is populated', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithCompleted);

		const completeStatus = result.appealStatus?.create.find((s) => s.status === APPEAL_CASE_STATUS.COMPLETE);
		assert.ok(completeStatus);
		assert.ok(completeStatus.createdAt instanceof Date);
		assert.strictEqual(completeStatus.valid, false);
	});

	test('creates WITHDRAWN status when caseWithdrawnDate is populated', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithWithdrawn);

		const withdrawnStatus = result.appealStatus?.create.find((s) => s.status === APPEAL_CASE_STATUS.WITHDRAWN);
		assert.ok(withdrawnStatus);
		assert.ok(withdrawnStatus.createdAt instanceof Date);
		assert.strictEqual(withdrawnStatus.valid, false);
	});

	test('handles allocationBand as regular number (non-Decimal)', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithNumberBand);

		assert.ok(result.allocation);
		assert.strictEqual(result.allocation.create.band, 3);
	});

	test('throws error for duplicate events', () => {
		const duplicateEventCases = [
			{ type: 'hearing', events: mockDuplicateHearingEvents, expectedError: /Duplicate hearing event/ },
			{ type: 'inquiry', events: mockDuplicateInquiryEvents, expectedError: /Duplicate inquiry event/ },
			{ type: 'siteVisit', events: mockDuplicateSiteVisitEvents, expectedError: /Duplicate siteVisit event/ }
		];

		duplicateEventCases.forEach(({ type, events, expectedError }) => {
			assert.throws(
				() => mapSourceToSinkAppeal(mockAppealHasCase, events),
				{ message: expectedError },
				`Should throw error for duplicate ${type} events`
			);
		});
	});

	test('throws error for duplicate appeal status', () => {
		assert.throws(
			() => mapSourceToSinkAppeal(MockCases.mockCaseWithDuplicateStatus),
			{ message: /Duplicate status 'ready_to_start' found/ },
			'Should throw error when current status matches a historical status'
		);
	});

	test('handles allocation with undefined band', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithUndefinedBand);

		// Should not create allocation if band is undefined
		assert.strictEqual(result.allocation, undefined);
	});

	test('handles neighbouring addresses with schema fields', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithSchemaAddresses);

		assert.ok(result.neighbouringSites);
		assert.strictEqual(result.neighbouringSites.create.length, 1);
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressLine1, '125 Main Street');
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressLine2, 'Apt 2');
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressTown, 'London');
		assert.strictEqual(result.neighbouringSites.create[0].address.create.addressCounty, 'Greater London');
		assert.strictEqual(result.neighbouringSites.create[0].address.create.postcode, 'SW1A 1AB');
	});

	test('handles parseNumber with Decimal type', () => {
		const result = mapSourceToSinkAppeal(MockCases.mockCaseWithDecimalBand);

		assert.ok(result.allocation);
		assert.strictEqual(result.allocation.create.band, 2.5);
	});
});

describe('mapSourceToSinkAppeal - LPA Questionnaire Mapping', () => {
	test('returns undefined lpaQuestionnaire when all fields are null', () => {
		const result = mapSourceToSinkAppeal(mockAppealHasCase);

		assert.strictEqual(result.lpaQuestionnaire, undefined);
	});

	test('maps scalar date fields', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireCreatedDate: '2024-02-05T09:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.lpaQuestionnaireSubmittedDate instanceof Date);
		assert.ok(result.lpaQuestionnaire.create.lpaqCreatedDate instanceof Date);
	});

	test('does not set lpaqCreatedDate when lpaQuestionnaireCreatedDate is null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireCreatedDate: null
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaqCreatedDate, undefined);
	});

	test('maps lpaQuestionnairePublishedDate to siteNoticesSentDate', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnairePublishedDate: '2024-02-20T10:00:00.000Z'
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.siteNoticesSentDate instanceof Date);
		assert.strictEqual(result.lpaQuestionnaire.create.siteNoticesSentDate.toISOString(), '2024-02-20T10:00:00.000Z');
	});

	test('maps lpaProcedurePreferenceDuration Decimal to number', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaProcedurePreferenceDuration: new Decimal(3)
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreferenceDuration, 3);
	});

	test('maps lpaQuestionnaireValidationOutcome via connect by name', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnaireValidationOutcome: 'complete'
		};

		const result = mapSourceToSinkAppeal(source);

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

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaQuestionnaireValidationOutcome, undefined);
	});

	test('maps notificationMethod comma-separated string to lpaNotificationMethods array', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			notificationMethod: 'letter,email,site-notice'
		};

		const result = mapSourceToSinkAppeal(source);

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

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaNotificationMethods, undefined);
	});

	test('maps boolean fields', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			isCorrectAppealType: true,
			inConservationArea: false,
			isGreenBelt: true,
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

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.isCorrectAppealType, true);
		assert.strictEqual(result.lpaQuestionnaire.create.inConservationArea, false);
		assert.strictEqual(result.lpaQuestionnaire.create.isGreenBelt, true);
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

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.infrastructureLevyAdoptedDate instanceof Date);
		assert.ok(result.lpaQuestionnaire.create.infrastructureLevyExpectedDate instanceof Date);
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

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.dateCostsReportDespatched instanceof Date);
		assert.ok(result.lpaQuestionnaire.create.dateNotRecoveredOrDerecovered instanceof Date);
		assert.ok(result.lpaQuestionnaire.create.dateRecovered instanceof Date);
		assert.ok(result.lpaQuestionnaire.create.originalCaseDecisionDate instanceof Date);
		assert.ok(result.lpaQuestionnaire.create.targetDate instanceof Date);
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
			importantInformation: 'Important info',
			designatedSitesNames: 'Custom site name'
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaStatement, 'LPA statement text');
		assert.strictEqual(result.lpaQuestionnaire.create.newConditionDetails, 'New condition details');
		assert.strictEqual(result.lpaQuestionnaire.create.siteAccessDetails, 'Site access info');
		assert.strictEqual(result.lpaQuestionnaire.create.siteSafetyDetails, 'Safety info');
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreference, 'hearing');
		assert.strictEqual(result.lpaQuestionnaire.create.lpaProcedurePreferenceDetails, 'Preference details');
		assert.strictEqual(result.lpaQuestionnaire.create.reasonForNeighbourVisits, 'Reason text');
		assert.strictEqual(result.lpaQuestionnaire.create.importantInformation, 'Important info');
		assert.strictEqual(result.lpaQuestionnaire.create.designatedSiteNameCustom, 'Custom site name');
	});

	test('creates lpaQuestionnaire when only a boolean field is set', () => {
		const source = {
			...mockAppealHasCase,
			isGreenBelt: true
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.isGreenBelt, true);
	});

	test('maps redeterminedIndicator true as boolean and coerces to string', () => {
		const source = { ...mockAppealHasCase, redeterminedIndicator: true };
		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.redeterminedIndicator, 'true');
	});

	test('maps redeterminedIndicator false as boolean and does not drop it', () => {
		const source = { ...mockAppealHasCase, redeterminedIndicator: false };
		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.redeterminedIndicator, 'false');
	});

	test('omits redeterminedIndicator when null', () => {
		const source = { ...mockAppealHasCase, redeterminedIndicator: null };
		const result = mapSourceToSinkAppeal(source);

		assert.strictEqual(result.lpaQuestionnaire, undefined);
	});

	test('maps affectedListedBuildingNumbers comma-separated string to listedBuildingDetails array', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			affectedListedBuildingNumbers: '1234567,7654321'
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.ok(result.lpaQuestionnaire.create.listedBuildingDetails);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails.create.length, 2);
		assert.strictEqual(
			result.lpaQuestionnaire.create.listedBuildingDetails.create[0].listedBuilding.connect.reference,
			'1234567'
		);
		assert.strictEqual(
			result.lpaQuestionnaire.create.listedBuildingDetails.create[1].listedBuilding.connect.reference,
			'7654321'
		);
	});

	test('omits listedBuildingDetails when affectedListedBuildingNumbers is null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			affectedListedBuildingNumbers: null
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.listedBuildingDetails, undefined);
	});

	test('omits lpaCostsAppliedFor when null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaCostsAppliedFor: null
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.lpaCostsAppliedFor, undefined);
	});

	test('omits designatedSiteNameCustom when designatedSitesNames is null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			designatedSitesNames: null
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.designatedSiteNameCustom, undefined);
	});

	test('omits siteNoticesSentDate when lpaQuestionnairePublishedDate is null', () => {
		const source = {
			...mockAppealHasCase,
			lpaQuestionnaireSubmittedDate: '2024-02-10T10:00:00.000Z',
			lpaQuestionnairePublishedDate: null
		};

		const result = mapSourceToSinkAppeal(source);

		assert.ok(result.lpaQuestionnaire);
		assert.strictEqual(result.lpaQuestionnaire.create.siteNoticesSentDate, undefined);
	});
});
