import type { AppealHas } from '@pins/odw-curated-database/src/client/client.ts';

/**
 * Complete AppealHas case with all fields populated for comprehensive testing
 */
export const completeAppealHasCase: Partial<AppealHas> = {
	caseId: 1,
	caseReference: 'CASE-001',
	lpaCode: 'Q9999',
	applicationReference: 'APP-001',
	caseCreatedDate: '2024-01-01T00:00:00Z',
	caseUpdatedDate: '2024-01-02T00:00:00Z',
	caseValidDate: '2024-01-03T00:00:00Z',
	caseStartedDate: '2024-01-04T00:00:00Z',
	casePublishedDate: '2024-01-05T00:00:00Z',
	caseCompletedDate: '2024-01-06T00:00:00Z',
	caseWithdrawnDate: '2024-01-07T00:00:00Z',

	// Address fields
	siteAddressLine1: '123 Main Street',
	siteAddressLine2: 'Apartment 4B',
	siteAddressTown: 'Bristol',
	siteAddressCounty: 'Bristol',
	siteAddressPostcode: 'BS1 1AA',

	// AppellantCase fields
	applicationDate: '2024-01-01T00:00:00Z',
	applicationDecision: 'refused',
	applicationDecisionDate: '2024-01-15T00:00:00Z',
	siteAccessDetails: 'Gate at front',
	siteSafetyDetails: 'Watch for dog',
	siteAreaSquareMetres: 100.5 as any,
	floorSpaceSquareMetres: 50.25 as any,
	ownsAllLand: true,
	ownsSomeLand: false,
	advertisedAppeal: true,
	ownersInformed: true,
	originalDevelopmentDescription: 'Extension to house',
	changedDevelopmentDescription: false,
	appellantCostsAppliedFor: false,
	enforcementNotice: false,
	isGreenBelt: true,
	siteGridReferenceEasting: '123456',
	siteGridReferenceNorthing: '654321',
	caseworkReason: 'Complex case',
	jurisdiction: 'England',
	typeOfPlanningApplication: 'full',

	// LPAQuestionnaire fields
	lpaQuestionnaireSubmittedDate: '2024-01-10T00:00:00Z',
	lpaQuestionnaireCreatedDate: '2024-01-09T00:00:00Z',
	lpaStatement: 'LPA statement text',
	newConditionDetails: 'New conditions',
	isCorrectAppealType: true,
	inConservationArea: false,
	lpaCostsAppliedFor: false,
	affectsScheduledMonument: false,
	isAonbNationalLandscape: true,
	hasProtectedSpecies: false,
	hasInfrastructureLevy: true,
	isInfrastructureLevyFormallyAdopted: true,
	infrastructureLevyAdoptedDate: '2023-06-01T00:00:00Z',
	lpaProcedurePreference: 'hearing',
	lpaProcedurePreferenceDuration: 2 as any,
	reasonForNeighbourVisits: 'Impact on neighbours',

	// InspectorDecision fields
	caseDecisionOutcome: 'allowed',
	caseDecisionOutcomeDate: '2024-02-01T00:00:00Z'
};

/**
 * Minimal AppealHas case with only required fields
 */
export const minimalAppealHasCase: Partial<AppealHas> = {
	caseId: 2,
	caseReference: 'CASE-002',
	lpaCode: 'Q8888',
	caseCreatedDate: 'invalid-date',
	caseUpdatedDate: null
};

/**
 * AppealHas case with decimal values for testing number parsing
 */
export const decimalAppealHasCase: Partial<AppealHas> = {
	caseId: 3,
	caseReference: 'CASE-003',
	lpaCode: 'Q7777',
	caseCreatedDate: '2024-01-01T00:00:00Z',
	caseUpdatedDate: null,
	siteAreaSquareMetres: 150.75 as any,
	floorSpaceSquareMetres: null
};

/**
 * AppealHas case for testing missing required fields
 */
export const missingReferenceCase: Partial<AppealHas> = {
	caseId: 4,
	caseReference: null,
	lpaCode: 'Q9999'
};

/**
 * AppealHas case for testing missing LPA code
 */
export const missingLPACase: Partial<AppealHas> = {
	caseId: 5,
	caseReference: 'CASE-005',
	lpaCode: null
};
