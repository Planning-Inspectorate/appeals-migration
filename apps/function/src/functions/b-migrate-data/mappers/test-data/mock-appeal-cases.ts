import type { AppealHas } from '@pins/odw-curated-database/src/client/client.ts';
import { Decimal } from '@pins/odw-curated-database/src/client/internal/prismaNamespace.ts';
import { mockAppealHasCase } from './mock-appeal-has-case.ts';

// Simple mock cases for testing - minimal fields required
export const mockMinimalCase: AppealHas = {
	...mockAppealHasCase,
	caseReference: 'CASE-001',
	lpaCode: 'Q9999'
};

export const mockCaseWithoutReference: AppealHas = {
	...mockAppealHasCase,
	caseReference: null
};

export const mockCaseWithoutLpaCode: AppealHas = {
	...mockAppealHasCase,
	lpaCode: null
};

export const mockCaseWithMultipleStatuses: AppealHas = {
	...mockAppealHasCase,
	caseStatus: 'validation',
	caseValidationDate: '2024-01-22T09:00:00.000Z',
	lpaQuestionnairePublishedDate: '2024-02-20T10:00:00.000Z',
	caseWithdrawnDate: null,
	caseTransferredDate: '2024-03-01T14:00:00.000Z',
	caseCompletedDate: '2024-03-15T16:00:00.000Z'
};

export const mockCaseWithNullTimetable: AppealHas = {
	...mockAppealHasCase,
	lpaQuestionnaireDueDate: null,
	caseSubmissionDueDate: null
};

export const mockCaseWithDecision: AppealHas = {
	...mockAppealHasCase,
	caseDecisionOutcome: 'allowed',
	caseDecisionOutcomeDate: '2024-03-01T10:00:00.000Z'
};

export const mockCaseWithReferences: AppealHas = {
	...mockAppealHasCase,
	nearbyCaseReferences: JSON.stringify(['APP/2024/100', 'APP/2024/101'])
};

export const mockCaseWithNullPads: AppealHas = {
	...mockAppealHasCase,
	padsSapId: null
};

export const mockCaseWithPads: AppealHas = {
	...mockAppealHasCase,
	padsSapId: 'SAP-123'
};

export const mockCaseWithNullOfficer: AppealHas = {
	...mockAppealHasCase,
	caseOfficerId: null
};

export const mockCaseWithNullInspector: AppealHas = {
	...mockAppealHasCase,
	inspectorId: null
};

export const mockCaseWithNullAllocation: AppealHas = {
	...mockAppealHasCase,
	allocationLevel: null
};

export const mockCaseWithNullSpecialisms: AppealHas = {
	...mockAppealHasCase,
	caseSpecialisms: null
};

export const mockCaseWithNullDecision: AppealHas = {
	...mockAppealHasCase,
	caseDecisionOutcome: null
};

export const mockCaseWithNullWithdrawn: AppealHas = {
	...mockAppealHasCase,
	caseWithdrawnDate: null
};

export const mockCaseWithNullType: AppealHas = {
	...mockAppealHasCase,
	caseType: null
};

export const mockCaseWithNullProcedure: AppealHas = {
	...mockAppealHasCase,
	caseProcedure: null
};

export const mockCaseWithNullAppRef: AppealHas = {
	...mockAppealHasCase,
	applicationReference: null
};

export const mockCaseWithNullDates: AppealHas = {
	...mockAppealHasCase,
	caseCreatedDate: null,
	caseUpdatedDate: null,
	caseValidDate: null,
	caseExtensionDate: null,
	caseStartedDate: null,
	casePublishedDate: null,
	caseCompletedDate: null
};

export const mockCaseWithNullReferences: AppealHas = {
	...mockAppealHasCase,
	nearbyCaseReferences: null
};

export const mockCaseWithNullNeighbours: AppealHas = {
	...mockAppealHasCase,
	neighbouringSiteAddresses: null
};

export const mockCaseWithInvalidJsonSpecialisms: AppealHas = {
	...mockAppealHasCase,
	caseSpecialisms: '{invalid json'
};

export const mockCaseWithNonArrayJsonSpecialisms: AppealHas = {
	...mockAppealHasCase,
	caseSpecialisms: '{"key": "value"}'
};

export const mockCaseWithArrayAddresses: AppealHas = {
	...mockAppealHasCase,
	neighbouringSiteAddresses: JSON.stringify([
		{
			neighbouringSiteAddressLine1: '123 Main St',
			neighbouringSiteAddressLine2: null,
			neighbouringSiteAddressTown: 'London',
			neighbouringSiteAddressCounty: null,
			neighbouringSiteAddressPostcode: 'SW1A 1AA'
		},
		{
			neighbouringSiteAddressLine1: '125 Main St',
			neighbouringSiteAddressLine2: null,
			neighbouringSiteAddressTown: 'London',
			neighbouringSiteAddressCounty: null,
			neighbouringSiteAddressPostcode: 'SW1A 1AA'
		}
	])
};

export const mockCaseWithEmptyArrayAddresses: AppealHas = {
	...mockAppealHasCase,
	neighbouringSiteAddresses: '[]'
};

export const mockCaseWithObjectAddresses: AppealHas = {
	...mockAppealHasCase,
	neighbouringSiteAddresses: JSON.stringify([
		{
			neighbouringSiteAddressLine1: '123 Main Street',
			neighbouringSiteAddressLine2: 'Apt 4',
			neighbouringSiteAddressTown: 'London',
			neighbouringSiteAddressCounty: 'Greater London',
			neighbouringSiteAddressPostcode: 'SW1A 1AB'
		}
	])
};

export const mockCaseWithInvalidJsonAddresses: AppealHas = {
	...mockAppealHasCase,
	neighbouringSiteAddresses: '{invalid json'
};

export const mockCaseWithNonArrayJsonAddresses: AppealHas = {
	...mockAppealHasCase,
	neighbouringSiteAddresses: '{"key": "value"}'
};

export const mockCaseWithEmptyJsonArrayAddresses: AppealHas = {
	...mockAppealHasCase,
	neighbouringSiteAddresses: '[]'
};

export const mockCaseWithAllocation: AppealHas = {
	...mockAppealHasCase,
	allocationLevel: 'C',
	allocationBand: new Decimal(2)
};

export const mockCaseWithLpaDate: AppealHas = {
	...mockAppealHasCase,
	lpaQuestionnaireDueDate: '2024-06-01T10:00:00.000Z',
	caseSubmissionDueDate: null
};

export const mockCaseWithSubmissionDate: AppealHas = {
	...mockAppealHasCase,
	lpaQuestionnaireDueDate: null,
	caseSubmissionDueDate: '2024-07-01T10:00:00.000Z'
};

export const mockCaseWithExtension: AppealHas = {
	...mockAppealHasCase,
	caseExtensionDate: '2024-05-15T10:00:00.000Z'
};

export const mockCaseWithCompleted: AppealHas = {
	...mockAppealHasCase,
	caseStatus: 'closed',
	caseCompletedDate: '2024-08-01T10:00:00.000Z'
};

export const mockCaseWithWithdrawn: AppealHas = {
	...mockAppealHasCase,
	caseStatus: 'complete',
	caseWithdrawnDate: '2024-07-15T10:00:00.000Z'
};

export const mockCaseWithNumberBand: AppealHas = {
	...mockAppealHasCase,
	allocationLevel: 'B',
	allocationBand: new Decimal(3)
};

export const mockCaseWithDuplicateStatus: AppealHas = {
	...mockAppealHasCase,
	caseStatus: 'ready_to_start',
	caseValidationDate: '2024-01-22T09:00:00.000Z'
};

export const mockCaseWithUndefinedBand: AppealHas = {
	...mockAppealHasCase,
	allocationLevel: 'A',
	allocationBand: null
};

export const mockCaseWithSchemaAddresses: AppealHas = {
	...mockAppealHasCase,
	neighbouringSiteAddresses: JSON.stringify([
		{
			neighbouringSiteAddressLine1: '125 Main Street',
			neighbouringSiteAddressLine2: 'Apt 2',
			neighbouringSiteAddressTown: 'London',
			neighbouringSiteAddressCounty: 'Greater London',
			neighbouringSiteAddressPostcode: 'SW1A 1AB',
			neighbouringSiteAccessDetails: 'Gate code required',
			neighbouringSiteSafetyDetails: 'Guard dog on premises'
		}
	])
};

export const mockCaseWithDecimalBand: AppealHas = {
	...mockAppealHasCase,
	allocationLevel: 'B',
	allocationBand: new Decimal(2.5)
};
