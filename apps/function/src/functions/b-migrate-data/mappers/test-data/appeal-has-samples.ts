import type { AppealHas } from '@pins/odw-curated-database/src/client/client.ts';
import { Decimal } from '@pins/odw-curated-database/src/client/internal/prismaNamespace.ts';

/**
 * Complete AppealHas case with all fields populated for comprehensive testing
 */
export const completeAppealHasCase: AppealHas = {
	caseId: 1,
	caseReference: 'CASE-001',
	submissionId: 'SUB-001',
	lpaCode: 'Q9999',
	applicationReference: 'APP-001',
	caseCreatedDate: '2024-01-01T00:00:00Z',
	caseUpdatedDate: '2024-01-02T00:00:00Z',
	caseValidDate: '2024-01-03T00:00:00Z',
	caseValidationDate: '2024-01-03T00:00:00Z',
	caseStartedDate: '2024-01-04T00:00:00Z',
	casePublishedDate: '2024-01-05T00:00:00Z',
	caseCompletedDate: '2024-01-06T00:00:00Z',
	caseWithdrawnDate: '2024-01-07T00:00:00Z',
	caseTransferredDate: '2024-01-08T00:00:00Z',
	caseExtensionDate: '2024-01-09T00:00:00Z',
	caseSubmittedDate: '2024-01-01T00:00:00Z',
	caseSubmissionDueDate: '2024-01-15T00:00:00Z',

	// Case type and status
	caseStatus: 'ready_to_start',
	caseType: 'D',
	caseProcedure: 'written',
	linkedCaseStatus: null,
	leadCaseReference: null,
	transferredCaseClosedDate: null,

	// Team assignments
	caseOfficerId: 'officer-123',
	inspectorId: 'inspector-456',
	padsSapId: 'SAP-789',

	// Allocation
	allocationLevel: 'A',
	allocationBand: new Decimal(1),
	caseSpecialisms: 'Historic Buildings, Trees',

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
	siteAreaSquareMetres: new Decimal(100.5),
	floorSpaceSquareMetres: new Decimal(50.25),
	ownsAllLand: true,
	ownsSomeLand: false,
	advertisedAppeal: true,
	notificationMethod: 'Letter',
	ownersInformed: true,
	originalDevelopmentDescription: 'Extension to house',
	changedDevelopmentDescription: false,
	nearbyCaseReferences: 'CASE-100, CASE-101',
	neighbouringSiteAddresses: '125 Main Street, 127 Main Street',
	affectedListedBuildingNumbers: 'LB-001, LB-002',
	appellantCostsAppliedFor: false,
	enforcementNotice: false,
	isGreenBelt: true,
	siteGridReferenceEasting: '123456',
	siteGridReferenceNorthing: '654321',
	caseworkReason: 'Complex case',
	jurisdiction: 'England',
	typeOfPlanningApplication: 'full',
	hasLandownersPermission: true,

	// Validation fields - complex parsing
	caseValidationOutcome: 'incomplete',
	caseValidationIncompleteDetails: 'Documents missing: Site plan not provided, Incorrect fee: Payment incomplete',
	caseValidationInvalidDetails: null,

	// Knowledge of owners - lookup fields
	knowsOtherOwners: 'Yes',
	knowsAllOwners: 'No',

	// LPAQuestionnaire fields
	lpaQuestionnaireDueDate: '2024-01-20T00:00:00Z',
	lpaQuestionnaireSubmittedDate: '2024-01-10T00:00:00Z',
	lpaQuestionnaireCreatedDate: '2024-01-09T00:00:00Z',
	lpaQuestionnairePublishedDate: '2024-01-11T00:00:00Z',
	lpaQuestionnaireValidationOutcome: 'complete',
	lpaQuestionnaireValidationOutcomeDate: '2024-01-12T00:00:00Z',
	lpaQuestionnaireValidationDetails: null,
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
	infrastructureLevyExpectedDate: null,
	lpaProcedurePreference: 'hearing',
	lpaProcedurePreferenceDetails: 'Hearing preferred due to complexity',
	lpaProcedurePreferenceDuration: new Decimal(2),
	reasonForNeighbourVisits: 'Impact on neighbours',

	// InspectorDecision fields
	caseDecisionOutcome: 'allowed',
	caseDecisionOutcomeDate: '2024-02-01T00:00:00Z',
	caseDecisionPublishedDate: '2024-02-02T00:00:00Z',

	// Additional date fields
	importantInformation: 'High profile case',
	redeterminedIndicator: false,
	dateCostsReportDespatched: null,
	dateNotRecoveredOrDerecovered: null,
	dateRecovered: null,
	originalCaseDecisionDate: null,
	targetDate: '2024-03-01T00:00:00Z',
	isSiteInAreaOfSpecialControlAdverts: false,
	wasApplicationRefusedDueToHighwayOrTraffic: false,
	didAppellantSubmitCompletePhotosAndPlans: true,
	advertDetails: null,
	designatedSitesNames: 'SSSI-123'
};

/**
 * Minimal AppealHas case with only required fields
 * Test data for minimal case scenarios
 */
export const minimalAppealHasCase = {
	caseId: 2,
	caseReference: 'CASE-002',
	lpaCode: 'Q8888'
};

/**
 * AppealHas case with decimal values for testing number parsing
 * Test data for decimal field parsing
 */
export const decimalAppealHasCase = {
	caseId: 3,
	caseReference: 'CASE-003',
	lpaCode: 'Q7777',
	allocationBand: '2.5',
	siteAreaSquareMetres: '150.75',
	floorSpaceSquareMetres: null
};

/**
 * AppealHas case for testing missing required fields
 * Test data for validation scenarios
 */
export const missingReferenceCase = {
	caseId: 4,
	caseReference: null,
	lpaCode: 'Q9999'
};

/**
 * AppealHas case for testing missing LPA code
 * Test data for LPA validation scenarios
 */
export const missingLPACase = {
	caseId: 5,
	caseReference: 'CASE-005',
	lpaCode: null
};

/**
 * AppealHas case with advert details for testing array parsing
 * Test data for advert details array handling
 */
export const caseWithAdvertDetails = {
	caseId: 13,
	caseReference: 'CASE-013',
	lpaCode: 'Q9999',
	advertDetails: [
		{ advertInPosition: true, highwayLand: false },
		{ advertInPosition: false, highwayLand: true }
	], // Array format for advert details in source data
	applicationDate: '2024-01-01T00:00:00Z'
};

/**
 * AppealHas case with notification methods for testing comma-separated string parsing
 * Test data for notification method parsing
 */
export const caseWithNotificationMethods = {
	caseId: 14,
	caseReference: 'CASE-014',
	lpaCode: 'Q9999',
	notificationMethod: 'email,post,website',
	lpaQuestionnaireSubmittedDate: '2024-01-01T00:00:00Z'
};
