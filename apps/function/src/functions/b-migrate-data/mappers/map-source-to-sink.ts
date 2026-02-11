import type { AppealHas, AppealS78 } from '@pins/odw-curated-database/src/client/client.ts';
import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';

/**
 * Parse date string to Date object
 */
function parseDate(dateString: string | null | undefined): Date | undefined {
	if (!dateString) return undefined;
	const date = new Date(dateString);
	return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Parse number value, handling Prisma Decimal type
 */
function parseNumber(value: any): number | undefined {
	if (value === null || value === undefined) return undefined;

	if (typeof value === 'object' && value !== null && 'toNumber' in value) {
		return value.toNumber();
	}

	const num = Number(value);
	return isNaN(num) ? undefined : num;
}

/**
 * Convert empty strings to undefined
 */
function stringOrUndefined(value: string | null | undefined): string | undefined {
	return value || undefined;
}

/**
 * Parse comma-separated specialisms string into array
 */
function parseSpecialisms(specialismsString: string | null | undefined): string[] {
	if (!specialismsString) return [];
	return specialismsString
		.split(',')
		.map((s) => s.trim())
		.filter((s) => s.length > 0);
}

/**
 * Parse validation details string into structured reason objects
 */
function parseValidationDetails(
	detailsString: string | null | undefined,
	type: 'incomplete' | 'invalid'
): any[] | undefined {
	if (!detailsString) return undefined;

	return detailsString
		.split(',')
		.map((detail) => {
			const trimmedDetail = detail.trim();
			if (!trimmedDetail) return null;

			const colonIndex = trimmedDetail.indexOf(':');
			let reasonName: string;
			let textDetail: string | undefined;

			if (colonIndex > 0) {
				reasonName = trimmedDetail.substring(0, colonIndex).trim();
				textDetail = trimmedDetail.substring(colonIndex + 1).trim();
			} else {
				reasonName = trimmedDetail;
			}

			const baseObject: any = {
				[type === 'incomplete' ? 'appellantCaseIncompleteReason' : 'appellantCaseInvalidReason']: {
					connectOrCreate: {
						where: { name: reasonName },
						create: { name: reasonName }
					}
				}
			};

			if (textDetail) {
				baseObject[type === 'incomplete' ? 'appellantCaseIncompleteReasonText' : 'appellantCaseInvalidReasonText'] = {
					create: { text: textDetail }
				};
			}

			return baseObject;
		})
		.filter((obj) => obj !== null);
}

/**
 * Build validation outcome connection
 */
function buildValidationOutcome(outcome: string | null | undefined) {
	if (!outcome) return;
	return { connect: { name: outcome.toLowerCase() } };
}

/**
 * Build validation reasons with parsed details
 */
function buildValidationReasons(details: string | null | undefined, type: 'incomplete' | 'invalid') {
	const parsed = parseValidationDetails(details, type);
	if (!parsed) return;
	return { create: parsed };
}

/**
 * Build knowledge of other landowners mapping
 */
function buildKnowledgeMapping(knowledge: string | null | undefined) {
	if (!knowledge) return;
	return { connect: { name: knowledge } };
}

/**
 * Build appeal type connection
 */
function buildAppealType(caseType: string | null | undefined) {
	if (!caseType) return;
	return { connect: { key: caseType } };
}

/**
 * Build procedure type connection, defaults to 'written'
 */
function buildProcedureType(caseProcedure: string | null | undefined) {
	const key = caseProcedure || 'written';
	return { connect: { key } };
}

/**
 * Build PADS inspector connection
 */
function buildPadsInspector(padsSapId: string | null | undefined) {
	if (!padsSapId) return;
	return { connect: { sapId: padsSapId } };
}

/**
 * Build case officer connection via Azure AD user ID
 */
function buildCaseOfficer(caseOfficerId: string | null | undefined) {
	if (!caseOfficerId) return;
	return { connect: { azureAdUserId: caseOfficerId } };
}

/**
 * Build inspector connection via Azure AD user ID
 */
function buildInspector(inspectorId: string | null | undefined) {
	if (!inspectorId) return;
	return { connect: { azureAdUserId: inspectorId } };
}

/**
 * Build appeal timetable with due dates
 */
function buildAppealTimetable(
	source: AppealHas | AppealS78
): { create: Prisma.AppealTimetableCreateWithoutAppealInput } | undefined {
	const hasData = !!(source.lpaQuestionnaireDueDate || source.caseSubmissionDueDate);

	if (!hasData) return;

	return {
		create: {
			lpaQuestionnaireDueDate: parseDate(source.lpaQuestionnaireDueDate),
			caseResubmissionDueDate: parseDate(source.caseSubmissionDueDate)
		}
	};
}

/**
 * Build appeal allocation with level and band
 */
function buildAppealAllocation(
	source: AppealHas | AppealS78
): { create: Prisma.AppealAllocationCreateWithoutAppealInput } | undefined {
	if (!source.allocationLevel || !source.allocationBand) return;

	const band = parseNumber(source.allocationBand);
	if (!band) return;

	return {
		create: {
			level: source.allocationLevel,
			band: band
		}
	};
}

/**
 * Build appeal status array
 */
function buildAppealStatus(
	source: AppealHas | AppealS78
): { create: Prisma.AppealStatusCreateWithoutAppealInput[] } | undefined {
	if (!source.caseStatus) return;

	return {
		create: [
			{
				status: source.caseStatus,
				valid: true
			}
		]
	};
}

/**
 * Build appeal specialisms array with connectOrCreate
 */
function buildAppealSpecialisms(
	source: AppealHas | AppealS78
): { create: Prisma.AppealSpecialismCreateWithoutAppealInput[] } | undefined {
	const specialisms = parseSpecialisms(source.caseSpecialisms);
	if (specialisms.length === 0) return;

	return {
		create: specialisms.map((name) => ({
			specialism: {
				connectOrCreate: {
					where: { name },
					create: { name }
				}
			}
		}))
	};
}

/**
 * Build address from site address fields
 */
function buildAddress(source: AppealHas | AppealS78): { create: Prisma.AddressCreateWithoutAppealInput } | undefined {
	if (!source.siteAddressLine1) return;

	return {
		create: {
			addressLine1: stringOrUndefined(source.siteAddressLine1),
			addressLine2: stringOrUndefined(source.siteAddressLine2),
			addressTown: stringOrUndefined(source.siteAddressTown),
			addressCounty: stringOrUndefined(source.siteAddressCounty),
			postcode: stringOrUndefined(source.siteAddressPostcode)
		}
	};
}

/**
 * Build appellant case with all related fields
 */
function buildAppellantCase(
	source: AppealHas | AppealS78
): { create: Prisma.AppellantCaseCreateWithoutAppealInput } | undefined {
	const hasData = !!(
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
		source.typeOfPlanningApplication ||
		source.caseValidationOutcome ||
		source.caseValidationIncompleteDetails ||
		source.caseValidationInvalidDetails ||
		source.hasLandownersPermission !== null
	);

	if (!hasData) return;

	return {
		create: {
			applicationDate: parseDate(source.applicationDate),
			applicationDecision: stringOrUndefined(source.applicationDecision),
			applicationDecisionDate: parseDate(source.applicationDecisionDate),

			caseSubmittedDate: parseDate(source.caseSubmittedDate) ?? new Date(0),
			caseSubmissionDueDate: parseDate(source.caseSubmissionDueDate),

			siteAccessDetails: stringOrUndefined(source.siteAccessDetails),
			siteSafetyDetails: stringOrUndefined(source.siteSafetyDetails),
			siteAreaSquareMetres: parseNumber(source.siteAreaSquareMetres),
			floorSpaceSquareMetres: parseNumber(source.floorSpaceSquareMetres),

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

			typeOfPlanningApplication: stringOrUndefined(source.typeOfPlanningApplication),
			landownerPermission: source.hasLandownersPermission ?? undefined,
			appellantCaseValidationOutcome: buildValidationOutcome(source.caseValidationOutcome),
			appellantCaseIncompleteReasonsSelected: buildValidationReasons(
				source.caseValidationIncompleteDetails,
				'incomplete'
			),
			appellantCaseInvalidReasonsSelected: buildValidationReasons(source.caseValidationInvalidDetails, 'invalid'),
			knowsOtherOwners: buildKnowledgeMapping(source.knowsOtherOwners),
			knowsAllOwners: buildKnowledgeMapping(source.knowsAllOwners)
		}
	};
}

/**
 * Build inspector decision if outcome exists
 */
function buildInspectorDecision(
	source: AppealHas | AppealS78
): { create: Prisma.InspectorDecisionCreateWithoutAppealInput } | undefined {
	if (!source.caseDecisionOutcome) return;

	return {
		create: {
			outcome: source.caseDecisionOutcome,
			caseDecisionOutcomeDate: parseDate(source.caseDecisionOutcomeDate)
		}
	};
}

/**
 * Build LPA questionnaire with all related fields
 */
function buildLPAQuestionnaire(
	source: AppealHas | AppealS78
): { create: Prisma.LPAQuestionnaireCreateWithoutAppealInput } | undefined {
	const hasData = !!(
		source.lpaQuestionnaireSubmittedDate ||
		source.lpaQuestionnaireCreatedDate ||
		source.lpaStatement ||
		source.newConditionDetails ||
		source.isCorrectAppealType !== null ||
		source.inConservationArea !== null ||
		source.lpaCostsAppliedFor !== null ||
		source.lpaProcedurePreference
	);

	if (!hasData) return;

	return {
		create: {
			lpaQuestionnaireSubmittedDate: parseDate(source.lpaQuestionnaireSubmittedDate),
			lpaqCreatedDate: parseDate(source.lpaQuestionnaireCreatedDate) ?? new Date(0),
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
			lpaProcedurePreferenceDuration: parseNumber(source.lpaProcedurePreferenceDuration),
			reasonForNeighbourVisits: stringOrUndefined(source.reasonForNeighbourVisits),

			importantInformation: stringOrUndefined(source.importantInformation),
			redeterminedIndicator: source.redeterminedIndicator !== null ? String(source.redeterminedIndicator) : undefined,
			dateCostsReportDespatched: parseDate(source.dateCostsReportDespatched),
			dateNotRecoveredOrDerecovered: parseDate(source.dateNotRecoveredOrDerecovered),
			dateRecovered: parseDate(source.dateRecovered),
			originalCaseDecisionDate: parseDate(source.originalCaseDecisionDate),
			targetDate: parseDate(source.targetDate),
			siteNoticesSentDate: parseDate(source.lpaQuestionnairePublishedDate),
			isSiteInAreaOfSpecialControlAdverts: source.isSiteInAreaOfSpecialControlAdverts ?? undefined,
			wasApplicationRefusedDueToHighwayOrTraffic: source.wasApplicationRefusedDueToHighwayOrTraffic ?? undefined,
			didAppellantSubmitCompletePhotosAndPlans: source.didAppellantSubmitCompletePhotosAndPlans ?? undefined,
			designatedSiteNameCustom: stringOrUndefined(source.designatedSitesNames)
		}
	};
}

/**
 * Map AppealHas source case to sink Appeal model with all nested relations
 */
export function mapSourceToSinkAppeal(sourceCase: AppealHas | AppealS78): Prisma.AppealCreateInput {
	if (!sourceCase.caseReference) {
		throw new Error('caseReference is required for appeal migration');
	}

	if (!sourceCase.lpaCode) {
		throw new Error('lpaCode is required for appeal migration');
	}

	return {
		reference: sourceCase.caseReference,
		submissionId: stringOrUndefined(sourceCase.submissionId),

		appealType: buildAppealType(sourceCase.caseType),
		procedureType: buildProcedureType(sourceCase.caseProcedure),
		caseOfficer: buildCaseOfficer(sourceCase.caseOfficerId),
		inspector: buildInspector(sourceCase.inspectorId),
		padsInspector: buildPadsInspector(sourceCase.padsSapId),

		applicationReference: stringOrUndefined(sourceCase.applicationReference),
		caseCreatedDate: parseDate(sourceCase.caseCreatedDate),
		caseUpdatedDate: parseDate(sourceCase.caseUpdatedDate),
		caseValidDate: parseDate(sourceCase.caseValidDate),
		caseExtensionDate: parseDate(sourceCase.caseExtensionDate),
		caseStartedDate: parseDate(sourceCase.caseStartedDate),
		casePublishedDate: parseDate(sourceCase.casePublishedDate),
		caseCompletedDate: parseDate(sourceCase.caseCompletedDate),
		withdrawalRequestDate: parseDate(sourceCase.caseWithdrawnDate),
		caseTransferredId: stringOrUndefined(sourceCase.caseTransferredDate),

		lpa: {
			connect: { lpaCode: sourceCase.lpaCode }
		},

		address: buildAddress(sourceCase),
		appellantCase: buildAppellantCase(sourceCase),
		lpaQuestionnaire: buildLPAQuestionnaire(sourceCase),
		inspectorDecision: buildInspectorDecision(sourceCase),
		appealTimetable: buildAppealTimetable(sourceCase),
		allocation: buildAppealAllocation(sourceCase),
		appealStatus: buildAppealStatus(sourceCase),
		specialisms: buildAppealSpecialisms(sourceCase)
	};
}
