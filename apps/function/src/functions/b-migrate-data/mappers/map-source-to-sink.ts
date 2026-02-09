import type { AppealHas, AppealS78 } from '@pins/odw-curated-database/src/client/client.ts';
import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';

/**
 * Parse date string to DateTime or return undefined if invalid
 */
function parseDate(dateString: string | null | undefined): Date | undefined {
	if (!dateString) return undefined;
	const date = new Date(dateString);
	return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Parse decimal string to number or return undefined if invalid
 * Handles Prisma Decimal type which has a toNumber() method
 */
function parseDecimal(value: any): number | undefined {
	if (value === null || value === undefined) return undefined;

	// Handle Prisma Decimal type
	if (typeof value === 'object' && value !== null && 'toNumber' in value) {
		return value.toNumber();
	}

	const num = Number(value);
	return isNaN(num) ? undefined : num;
}

/**
 * Helper to convert empty strings to undefined
 */
function stringOrUndefined(value: string | null | undefined): string | undefined {
	return value || undefined;
}

/**
 * Check if source has appellant case data worth creating
 */
function hasAppellantCaseData(source: AppealHas | AppealS78): boolean {
	return !!(
		source.applicationDate ||
		source.applicationDecision ||
		source.siteAccessDetails ||
		source.siteSafetyDetails ||
		source.siteAreaSquareMetres ||
		source.floorSpaceSquareMetres ||
		source.ownsAllLand !== null ||
		source.ownsSomeLand !== null ||
		source.advertisedAppeal !== null ||
		source.originalDevelopmentDescription ||
		source.typeOfPlanningApplication
	);
}

/**
 * Check if source has LPA questionnaire data worth creating
 */
function hasLPAQuestionnaireData(source: AppealHas | AppealS78): boolean {
	return !!(
		source.lpaQuestionnaireSubmittedDate ||
		source.lpaQuestionnaireCreatedDate ||
		source.lpaStatement ||
		source.newConditionDetails ||
		source.isCorrectAppealType !== null ||
		source.inConservationArea !== null ||
		source.lpaCostsAppliedFor !== null ||
		source.lpaProcedurePreference
	);
}

/**
 * Build appellant case create input
 */
function buildAppellantCaseInput(source: AppealHas | AppealS78): Prisma.AppellantCaseCreateWithoutAppealInput {
	return {
		applicationDate: parseDate(source.applicationDate),
		applicationDecision: stringOrUndefined(source.applicationDecision),
		applicationDecisionDate: parseDate(source.applicationDecisionDate),

		siteAccessDetails: stringOrUndefined(source.siteAccessDetails),
		siteSafetyDetails: stringOrUndefined(source.siteSafetyDetails),
		siteAreaSquareMetres: parseDecimal(source.siteAreaSquareMetres),
		floorSpaceSquareMetres: parseDecimal(source.floorSpaceSquareMetres),

		ownsAllLand: source.ownsAllLand ?? undefined,
		ownsSomeLand: source.ownsSomeLand ?? undefined,
		hasAdvertisedAppeal: source.advertisedAppeal ?? undefined,
		ownersInformed: source.ownersInformed ?? undefined,

		originalDevelopmentDescription: stringOrUndefined(source.originalDevelopmentDescription),
		changedDevelopmentDescription: source.changedDevelopmentDescription ?? undefined,

		appellantCostsAppliedFor: source.appellantCostsAppliedFor ?? undefined,

		enforcementNotice: source.enforcementNotice ?? undefined,
		isGreenBelt: source.isGreenBelt ?? undefined,

		siteGridReferenceEasting: stringOrUndefined(source.siteGridReferenceEasting),
		siteGridReferenceNorthing: stringOrUndefined(source.siteGridReferenceNorthing),

		caseworkReason: stringOrUndefined(source.caseworkReason),
		jurisdiction: stringOrUndefined(source.jurisdiction),

		typeOfPlanningApplication: stringOrUndefined(source.typeOfPlanningApplication)
	};
}

/**
 * Build LPA questionnaire create input
 */
function buildLPAQuestionnaireInput(source: AppealHas | AppealS78): Prisma.LPAQuestionnaireCreateWithoutAppealInput {
	return {
		lpaQuestionnaireSubmittedDate: parseDate(source.lpaQuestionnaireSubmittedDate),
		lpaqCreatedDate: parseDate(source.lpaQuestionnaireCreatedDate) ?? new Date(),
		lpaStatement: stringOrUndefined(source.lpaStatement),
		newConditionDetails: stringOrUndefined(source.newConditionDetails),
		siteAccessDetails: stringOrUndefined(source.siteAccessDetails),
		siteSafetyDetails: stringOrUndefined(source.siteSafetyDetails),
		isCorrectAppealType: source.isCorrectAppealType ?? undefined,
		inConservationArea: source.inConservationArea ?? undefined,
		lpaCostsAppliedFor: source.lpaCostsAppliedFor ?? undefined,
		isGreenBelt: source.isGreenBelt ?? undefined,

		affectsScheduledMonument: source.affectsScheduledMonument ?? undefined,
		isAonbNationalLandscape: source.isAonbNationalLandscape ?? undefined,
		hasProtectedSpecies: source.hasProtectedSpecies ?? undefined,
		hasInfrastructureLevy: source.hasInfrastructureLevy ?? undefined,
		isInfrastructureLevyFormallyAdopted: source.isInfrastructureLevyFormallyAdopted ?? undefined,
		infrastructureLevyAdoptedDate: parseDate(source.infrastructureLevyAdoptedDate),
		infrastructureLevyExpectedDate: parseDate(source.infrastructureLevyExpectedDate),
		lpaProcedurePreference: stringOrUndefined(source.lpaProcedurePreference),
		lpaProcedurePreferenceDetails: stringOrUndefined(source.lpaProcedurePreferenceDetails),
		lpaProcedurePreferenceDuration: source.lpaProcedurePreferenceDuration
			? Number(source.lpaProcedurePreferenceDuration)
			: undefined,
		reasonForNeighbourVisits: stringOrUndefined(source.reasonForNeighbourVisits)
	};
}

/**
 * Map AppealHas source case to sink Appeal model with all nested relations
 */
export function mapSourceToSinkAppeal(sourceCase: AppealHas | AppealS78): Prisma.AppealCreateInput {
	// Reference is required - throw error if missing
	if (!sourceCase.caseReference) {
		throw new Error('caseReference is required for appeal migration');
	}

	// LPA is required - throw error if missing
	if (!sourceCase.lpaCode) {
		throw new Error('lpaCode is required for appeal migration');
	}

	const appeal: Prisma.AppealCreateInput = {
		reference: sourceCase.caseReference,

		applicationReference: stringOrUndefined(sourceCase.applicationReference),
		caseCreatedDate: parseDate(sourceCase.caseCreatedDate),
		caseUpdatedDate: parseDate(sourceCase.caseUpdatedDate),
		caseValidDate: parseDate(sourceCase.caseValidDate),
		caseExtensionDate: parseDate(sourceCase.caseExtensionDate),
		caseStartedDate: parseDate(sourceCase.caseStartedDate),
		casePublishedDate: parseDate(sourceCase.casePublishedDate),
		caseCompletedDate: parseDate(sourceCase.caseCompletedDate),
		withdrawalRequestDate: parseDate(sourceCase.caseWithdrawnDate),

		lpa: {
			connect: { lpaCode: sourceCase.lpaCode }
		},

		address: sourceCase.siteAddressLine1
			? {
					create: {
						addressLine1: stringOrUndefined(sourceCase.siteAddressLine1),
						addressLine2: stringOrUndefined(sourceCase.siteAddressLine2),
						addressTown: stringOrUndefined(sourceCase.siteAddressTown),
						addressCounty: stringOrUndefined(sourceCase.siteAddressCounty),
						postcode: stringOrUndefined(sourceCase.siteAddressPostcode)
					}
				}
			: undefined,

		appellantCase: hasAppellantCaseData(sourceCase)
			? {
					create: buildAppellantCaseInput(sourceCase)
				}
			: undefined,

		lpaQuestionnaire: hasLPAQuestionnaireData(sourceCase)
			? {
					create: buildLPAQuestionnaireInput(sourceCase)
				}
			: undefined,

		inspectorDecision: sourceCase.caseDecisionOutcome
			? {
					create: {
						outcome: sourceCase.caseDecisionOutcome,
						caseDecisionOutcomeDate: parseDate(sourceCase.caseDecisionOutcomeDate)
					}
				}
			: undefined
	};

	return appeal;
}
