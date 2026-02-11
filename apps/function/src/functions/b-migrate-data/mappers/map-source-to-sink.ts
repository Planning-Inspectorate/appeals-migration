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
 * Parse comma-separated addresses into NeighbouringSite create structure
 * Source format: "125 Main Street, 127 Main Street"
 */
function parseNeighbouringSiteAddresses(
	addressesString: string | null | undefined
): { create: Array<{ address: { create: Prisma.AddressCreateWithoutNeighbouringSitesInput } }> } | undefined {
	if (!addressesString) return undefined;

	const addresses = addressesString
		.split(',')
		.map((addr) => addr.trim())
		.filter((addr) => addr.length > 0);

	if (addresses.length === 0) return undefined;

	return {
		create: addresses.map((addressLine1) => ({
			address: {
				create: {
					addressLine1,
					addressCountry: 'United Kingdom'
				}
			}
		}))
	};
}

/**
 * Parse notification method array into LPANotificationMethodsSelected structure
 * Source format in JSON schema: ["notice", "letter", "advert"]
 * But in Prisma source it's a string, so we handle both
 */
function parseNotificationMethods(
	notificationMethod: string | string[] | null | undefined
): { create: Array<{ lpaNotificationMethod: { connect: { key: string } } }> } | undefined {
	if (!notificationMethod) return undefined;

	const methods = Array.isArray(notificationMethod)
		? notificationMethod
		: notificationMethod.split(',').map((m) => m.trim().toLowerCase());

	if (methods.length === 0) return undefined;

	// Map source notification methods to target keys
	const keyMapping: Record<string, string> = {
		email: 'notice',
		post: 'letter',
		website: 'advert',
		letter: 'letter',
		advert: 'advert',
		notice: 'notice'
	};

	return {
		create: methods.map((method) => {
			const key = keyMapping[method] || method;
			return {
				lpaNotificationMethod: { connect: { key } }
			};
		})
	};
}

/**
 * Parse advert details into AppellantCaseAdvertDetails structure
 * Source format in Prisma: string (but JSON schema shows array of objects)
 * For now, we can't parse this without knowing the exact format
 */
function parseAdvertDetails(
	advertDetails: string | any[] | null | undefined
): { createMany: { data: Array<{ advertInPosition: boolean; highwayLand: boolean }> } } | undefined {
	// If it's a string in source, we can't parse it without more information
	// The JSON schema shows it should be an array, but Prisma source schema has it as string
	if (!advertDetails) return undefined;

	// If it's already an array (from JSON schema format)
	if (Array.isArray(advertDetails) && advertDetails.length > 0) {
		return {
			createMany: {
				data: advertDetails.map((detail) => ({
					advertInPosition: detail.advertInPosition ?? false,
					highwayLand: detail.highwayLand ?? false
				}))
			}
		};
	}

	// String format not yet supported - needs reverse engineering
	return undefined;
}

/**
 * Parse affected listed building numbers into ListedBuildingSelected structure
 * Source format: comma-separated string "10023, 17824" or array
 */
function parseAffectedListedBuildings(
	affectedListedBuildingNumbers: string | string[] | null | undefined
): { create: Array<{ listEntry: string; affectsListedBuilding: boolean }> } | undefined {
	if (!affectedListedBuildingNumbers) return undefined;

	const numbers = Array.isArray(affectedListedBuildingNumbers)
		? affectedListedBuildingNumbers
		: affectedListedBuildingNumbers.split(',').map((n) => n.trim());

	if (numbers.length === 0) return undefined;

	return {
		create: numbers.map((listEntry) => ({
			listEntry,
			affectsListedBuilding: true
		}))
	};
}

/**
 * Parse nearby case references into AppealRelationship records
 * Source format: comma-separated string "CASE-100, CASE-101" or array
 * Maps to AppealRelationship table with type="related"
 */
function parseNearbyCaseReferences(
	currentCaseRef: string,
	nearbyCaseReferences: string | string[] | null | undefined
): { create: Array<{ type: string; parentRef: string; childRef: string }> } | undefined {
	if (!nearbyCaseReferences) return undefined;

	const references = Array.isArray(nearbyCaseReferences)
		? nearbyCaseReferences
		: nearbyCaseReferences.split(',').map((ref) => ref.trim());

	if (references.length === 0) return undefined;

	return {
		create: references.map((childRef) => ({
			type: 'related',
			parentRef: currentCaseRef,
			childRef
		}))
	};
}

/**
 * Type for validation reason detail objects
 * Contains either incomplete or invalid reason fields with their connectOrCreate structure
 */
type ValidationReasonDetail = Record<
	string,
	{
		connectOrCreate?: {
			where: { name: string };
			create: { name: string };
		};
		create?: Array<{ text: string }>;
	}
>;

/**
 * // Input without details
 * parseValidationDetails("Simple reason", "invalid")
 * // Returns: [{
 * //   appellantCaseInvalidReason: { connectOrCreate: { where: { name: "Simple reason" }, create: { name: "Simple reason" } } }
 * // }]
 */
function parseValidationDetails(
	detailsString: string | null | undefined,
	type: 'incomplete' | 'invalid'
): Array<ValidationReasonDetail> | undefined {
	if (!detailsString) return undefined;

	const reasons = detailsString
		.split(',')
		.map((reason) => reason.trim())
		.filter((reason) => reason.length > 0);

	if (reasons.length === 0) return undefined;

	const reasonKey = type === 'incomplete' ? 'appellantCaseIncompleteReason' : 'appellantCaseInvalidReason';
	const textKey = type === 'incomplete' ? 'appellantCaseIncompleteReasonText' : 'appellantCaseInvalidReasonText';

	return reasons.map((reason) => {
		const colonIndex = reason.indexOf(':');
		const hasDetail = colonIndex !== -1;
		const name = hasDetail ? reason.substring(0, colonIndex).trim() : reason.trim();
		const detail = hasDetail ? reason.substring(colonIndex + 1).trim() : '';

		const result: any = {
			[reasonKey]: {
				connectOrCreate: {
					where: { name },
					create: { name }
				}
			}
		};

		if (detail) {
			result[textKey] = {
				create: [{ text: detail }]
			};
		}

		return result;
	});
}

/**
 * Build validation outcome connection
 */
function buildValidationOutcome(outcome: string | null | undefined) {
	if (!outcome) return;
	return { connect: { name: outcome.toLowerCase() } };
}

/**
 * Build LPA questionnaire validation outcome connection
 */
function buildLPAValidationOutcome(outcome: string | null | undefined) {
	if (!outcome) return;
	return { connect: { name: outcome.toLowerCase() } };
}

/**
 * Build validation reasons with parsed details
 */
function buildValidationReasons(details: string | null | undefined, type: 'incomplete' | 'invalid') {
	const parsed = parseValidationDetails(details, type);
	if (!parsed) return;
	return { create: parsed as any };
}

/**
 * Build knowledge of other landowners mapping
 */
function buildKnowledgeMapping(knowledge: string | null | undefined) {
	if (!knowledge) return;
	return { connect: { key: knowledge } };
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
 * Uses connectOrCreate to handle cases where PADSUser doesn't exist yet
 * Note: name field is required but not available in source data, using sapId as placeholder
 */
function buildPadsInspector(padsSapId: string | null | undefined) {
	if (!padsSapId) return;
	return {
		connectOrCreate: {
			where: { sapId: padsSapId },
			create: {
				sapId: padsSapId,
				name: padsSapId // Placeholder - actual name should be updated separately
			}
		}
	};
}

/**
 * Build case officer connection via Azure AD user ID
 * Uses connectOrCreate to handle cases where User doesn't exist yet
 */
function buildCaseOfficer(caseOfficerId: string | null | undefined) {
	if (!caseOfficerId) return;
	return {
		connectOrCreate: {
			where: { azureAdUserId: caseOfficerId },
			create: { azureAdUserId: caseOfficerId }
		}
	};
}

/**
 * Build inspector connection via Azure AD user ID
 * Uses connectOrCreate to handle cases where User doesn't exist yet
 */
function buildInspector(inspectorId: string | null | undefined) {
	if (!inspectorId) return;
	return {
		connectOrCreate: {
			where: { azureAdUserId: inspectorId },
			create: { azureAdUserId: inspectorId }
		}
	};
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
				valid: true,
				// Use caseUpdatedDate as best guess for when this status was set
				createdAt: parseDate(source.caseUpdatedDate)
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
 *
 * Note: The schema specifies either grid references OR site address fields are required,
 * so checking siteAddressLine1 is sufficient as it's the primary address field.
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
			typeOfPlanningApplication: stringOrUndefined(source.typeOfPlanningApplication),

			knowsOtherOwners: buildKnowledgeMapping(source.knowsOtherOwners),
			knowsAllOwners: buildKnowledgeMapping(source.knowsAllOwners),

			siteGridReferenceEasting: stringOrUndefined(source.siteGridReferenceEasting),
			siteGridReferenceNorthing: stringOrUndefined(source.siteGridReferenceNorthing),

			caseworkReason: stringOrUndefined(source.caseworkReason),
			jurisdiction: stringOrUndefined(source.jurisdiction),

			landownerPermission: source.hasLandownersPermission ?? undefined,
			appellantCaseValidationOutcome: buildValidationOutcome(source.caseValidationOutcome),
			appellantCaseIncompleteReasonsSelected: buildValidationReasons(
				source.caseValidationIncompleteDetails,
				'incomplete'
			),
			appellantCaseInvalidReasonsSelected: buildValidationReasons(source.caseValidationInvalidDetails, 'invalid'),

			appellantCostsAppliedFor: source.appellantCostsAppliedFor ?? undefined,
			enforcementNotice: source.enforcementNotice ?? undefined,

			// Complex array-based fields
			appellantCaseAdvertDetails: parseAdvertDetails(source.advertDetails)

			// Note: source.nearbyCaseReferences - Mapped to Appeal.childAppeals (AppealRelationship table)
			// Note: source.isSiteOnHighwayLand - Handled within advertDetails mapping
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
			// source.lpaQuestionnaireCreatedDate: Mapped to lpaqCreatedDate in appeals-back-office
			lpaqCreatedDate: parseDate(source.lpaQuestionnaireCreatedDate) ?? new Date(0),
			lpaStatement: stringOrUndefined(source.lpaStatement),
			lpaQuestionnaireValidationOutcome: buildLPAValidationOutcome(source.lpaQuestionnaireValidationOutcome),
			// source.lpaQuestionnaireValidationOutcomeDate: Mapped to lpaqValidationDate in appeals-back-office
			// Logic: findStatusDate(appealStatus, EVENT) ?? findStatusDate(appealStatus, AWAITING_EVENT)
			// Using lpaqCreatedDate as approximation since field doesn't exist in sink
			// source.lpaQuestionnaireValidationDetails: CAN BE IMPLEMENTED - parsed from lpaQuestionnaireIncompleteReasonsSelected
			// Appeals-back-office reconstructs this from the reasons we're already storing
			newConditionDetails: stringOrUndefined(source.newConditionDetails),

			// Complex array-based fields
			lpaNotificationMethods: parseNotificationMethods(source.notificationMethod),
			listedBuildingDetails: parseAffectedListedBuildings(source.affectedListedBuildingNumbers),
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

	// Note: sourceCase.caseId is the source database primary key, not mapped to sink
	// The sink uses auto-increment id instead

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
		// source.caseValidationDate: VIRTUAL FIELD - calculated by appeals-back-office from appealStatus array, not stored in DB
		// Appeals-back-office calculates it on read, we don't store it on write
		caseExtensionDate: parseDate(sourceCase.caseExtensionDate),
		caseStartedDate: parseDate(sourceCase.caseStartedDate),
		casePublishedDate: parseDate(sourceCase.casePublishedDate),
		caseCompletedDate: parseDate(sourceCase.caseCompletedDate),
		withdrawalRequestDate: parseDate(sourceCase.caseWithdrawnDate),
		caseTransferredId: stringOrUndefined(sourceCase.caseTransferredDate),
		// source.transferredCaseClosedDate: VIRTUAL FIELD - calculated by appeals-back-office from appealStatus array, not stored in DB
		// source.caseDecisionPublishedDate: VIRTUAL FIELD - set to null by appeals-back-office, not stored in DB
		// source.linkedCaseStatus: VIRTUAL FIELD - calculated from childAppeals relation (if parent='lead', if child='child')
		// Can be derived from childAppeals relation we're already storing
		// source.leadCaseReference: VIRTUAL FIELD - calculated from childAppeals relation (appeal.reference if lead, child.parentRef if child)
		// Can be derived from childAppeals relation we're already storing

		lpa: {
			connect: { lpaCode: sourceCase.lpaCode }
		},

		address: buildAddress(sourceCase),
		neighbouringSites: parseNeighbouringSiteAddresses(sourceCase.neighbouringSiteAddresses),
		childAppeals: parseNearbyCaseReferences(sourceCase.caseReference, sourceCase.nearbyCaseReferences),
		appellantCase: buildAppellantCase(sourceCase),
		lpaQuestionnaire: buildLPAQuestionnaire(sourceCase),
		inspectorDecision: buildInspectorDecision(sourceCase),
		appealTimetable: buildAppealTimetable(sourceCase),
		allocation: buildAppealAllocation(sourceCase),
		appealStatus: buildAppealStatus(sourceCase),
		specialisms: buildAppealSpecialisms(sourceCase)
	};
}
