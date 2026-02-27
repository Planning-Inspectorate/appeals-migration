import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import type {
	AppealEvent,
	AppealHas,
	AppealS78,
	AppealServiceUser
} from '@pins/odw-curated-database/src/client/client.ts';
import type { Schemas } from '@planning-inspectorate/data-model';
import { APPEAL_CASE_STATUS } from '@planning-inspectorate/data-model';
import {
	booleanOrUndefined,
	parseDateOrUndefined,
	parseJsonArray,
	parseNumber,
	stringOrUndefined
} from '../../shared/helpers/index.ts';
import { FOLDERS } from './folders.ts';
import { mapEventToSink } from './map-event-to-sink.ts';
import { mapServiceUsersToAppealRelations } from './map-service-user.ts';

export const APPEAL_REPRESENTATION_TYPE = Object.freeze({
	LPA_STATEMENT: 'lpa_statement',
	APPELLANT_STATEMENT: 'appellant_statement',
	COMMENT: 'comment',
	LPA_FINAL_COMMENT: 'lpa_final_comment',
	APPELLANT_FINAL_COMMENT: 'appellant_final_comment',
	LPA_PROOFS_EVIDENCE: 'lpa_proofs_evidence',
	APPELLANT_PROOFS_EVIDENCE: 'appellant_proofs_evidence'
});

/**
 * Parse specialisms from JSON array string
 */
function parseSpecialisms(specialisms: string | null | undefined): string[] {
	const parsed = parseJsonArray<string>(specialisms, 'specialisms');
	return parsed.filter(Boolean);
}

/**
 * Parse nearby case references from JSON array string
 */
function parseNearbyCaseReferences(caseReference: string, nearbyReferences: string | null | undefined) {
	const references = parseJsonArray<string>(nearbyReferences, 'nearbyCaseReferences');

	if (references.length === 0) return undefined;

	return {
		create: references.map((ref: string) => ({
			type: 'related',
			parentRef: caseReference,
			childRef: ref.trim()
		}))
	};
}

/**
 * Build neighbouring site address object
 */
function buildNeighbouringSiteAddress(
	address: NonNullable<Schemas.AppealHASCase['neighbouringSiteAddresses']>[number]
): Prisma.NeighbouringSiteCreateWithoutAppealInput {
	return {
		address: {
			create: {
				addressLine1: address.neighbouringSiteAddressLine1,
				addressLine2: address.neighbouringSiteAddressLine2 || undefined,
				addressTown: address.neighbouringSiteAddressTown || undefined,
				addressCounty: address.neighbouringSiteAddressCounty || undefined,
				postcode: address.neighbouringSiteAddressPostcode || undefined,
				addressCountry: 'United Kingdom'
			}
		}
	};
}

/**
 * Parse neighbouring site addresses from JSON array string
 */
function parseNeighbouringSiteAddresses(
	source: AppealHas | AppealS78
): { create: Prisma.NeighbouringSiteCreateWithoutAppealInput[] } | undefined {
	const addresses = parseJsonArray<NonNullable<Schemas.AppealHASCase['neighbouringSiteAddresses']>[number]>(
		source.neighbouringSiteAddresses,
		'neighbouringSiteAddresses'
	);

	if (addresses.length === 0) return undefined;

	return { create: addresses.map(buildNeighbouringSiteAddress) };
}

/**
 * Build appeal status array with multiple historical entries
 */
function buildAppealStatus(source: AppealHas | AppealS78) {
	const statuses = [
		{
			status: source.caseStatus,
			valid: true,
			// Use caseUpdatedDate as best guess for when this status was set
			createdAt: parseDateOrUndefined(source.caseUpdatedDate)
		}
	];

	// Helper function to add unique status entry
	const addUniqueStatus = (status: string, date: string | null | undefined, valid: boolean) => {
		if (!date) return;

		// Check if this status already exists
		const isDuplicate = statuses.some((existing) => existing.status === status);

		if (isDuplicate) {
			throw new Error(
				`Duplicate status '${status}' found for case ${source.caseReference}. This indicates a data issue.`
			);
		}

		statuses.push({
			status,
			valid,
			createdAt: parseDateOrUndefined(date)
		});
	};

	// Historical statuses in chronological order
	addUniqueStatus(APPEAL_CASE_STATUS.READY_TO_START, source.caseValidationDate, false);
	addUniqueStatus(APPEAL_CASE_STATUS.EVENT, source.lpaQuestionnairePublishedDate, false);
	addUniqueStatus(APPEAL_CASE_STATUS.WITHDRAWN, source.caseWithdrawnDate, false);
	addUniqueStatus(APPEAL_CASE_STATUS.TRANSFERRED, source.caseTransferredDate, false);
	addUniqueStatus(APPEAL_CASE_STATUS.CLOSED, source.transferredCaseClosedDate, false);
	addUniqueStatus(APPEAL_CASE_STATUS.COMPLETE, source.caseCompletedDate, false);

	return { create: statuses };
}

/**
 * Build appeal specialisms array with connectOrCreate
 */
function buildAppealSpecialisms(
	source: AppealHas | AppealS78
): { create: Prisma.AppealSpecialismCreateWithoutAppealInput[] } | undefined {
	const specialisms = parseSpecialisms(source.caseSpecialisms);

	// Deduplicate to prevent unnecessary connectOrCreate operations
	const uniqueSpecialisms = [...new Set(specialisms)];

	if (uniqueSpecialisms.length === 0) return undefined;

	return {
		create: uniqueSpecialisms.map((name) => ({
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
 * Build address object
 */
function buildAddress(source: AppealHas | AppealS78) {
	if (!source.siteAddressLine1) return undefined;

	return {
		create: {
			addressLine1: source.siteAddressLine1,
			addressLine2: stringOrUndefined(source.siteAddressLine2),
			addressTown: stringOrUndefined(source.siteAddressTown),
			addressCounty: stringOrUndefined(source.siteAddressCounty),
			postcode: stringOrUndefined(source.siteAddressPostcode),
			addressCountry: 'United Kingdom'
		}
	};
}

/**
 * Build appeal timetable object
 * Only creates timetable if at least one date field has data
 */
function buildAppealTimetable(source: AppealHas | AppealS78) {
	const create = {
		lpaQuestionnaireDueDate: parseDateOrUndefined(source.lpaQuestionnaireDueDate),
		planningObligationDueDate: parseDateOrUndefined((source as AppealS78).planningObligationDueDate),
		finalCommentsDueDate: parseDateOrUndefined((source as AppealS78).finalCommentsDueDate),
		ipCommentsDueDate: parseDateOrUndefined((source as AppealS78).interestedPartyRepsDueDate),
		proofOfEvidenceAndWitnessesDueDate: parseDateOrUndefined((source as AppealS78).proofsOfEvidenceDueDate),
		lpaStatementDueDate: parseDateOrUndefined((source as AppealS78).statementDueDate),
		statementOfCommonGroundDueDate: parseDateOrUndefined((source as AppealS78).statementOfCommonGroundDueDate)
	};

	if (!Object.values(create).some((v) => v !== undefined)) return undefined;

	return { create };
}

/**
 * Build allocation object
 */
function buildAppealAllocation(source: AppealHas | AppealS78) {
	if (!source.allocationLevel) return undefined;

	const band = parseNumber(source.allocationBand);
	if (band === undefined) return undefined;

	return {
		create: {
			level: source.allocationLevel,
			band
		}
	};
}

/**
 * Build LPA questionnaire validation outcome relation
 */
function buildLpaValidationOutcome(source: AppealHas | AppealS78) {
	const validationOutcome = stringOrUndefined(source.lpaQuestionnaireValidationOutcome);
	if (!validationOutcome) return undefined;
	return { connect: { name: validationOutcome } };
}

/**
 * Build LPA notification methods relation
 */
function buildLpaNotificationMethods(source: AppealHas | AppealS78) {
	const notificationMethods = parseJsonArray<string>(source.notificationMethod, 'notificationMethod');
	if (notificationMethods.length === 0) return undefined;
	return {
		create: notificationMethods.map((key) => ({
			lpaNotificationMethod: { connect: { key } }
		}))
	};
}

/**
 * Build listed building details relation
 */
function buildListedBuildingDetails(source: AppealHas | AppealS78) {
	const affectedNumbers = parseJsonArray<string>(source.affectedListedBuildingNumbers, 'affectedListedBuildingNumbers');
	const changedNumbers = parseJsonArray<string>(
		(source as AppealS78).changedListedBuildingNumbers,
		'changedListedBuildingNumbers'
	);

	const entries = [
		...affectedNumbers.map((listEntry) => ({ listEntry, affectsListedBuilding: true })),
		...changedNumbers.map((listEntry) => ({ listEntry, affectsListedBuilding: true }))
	];

	if (entries.length === 0) return undefined;
	return { create: entries };
}

/**
 * Merge interested party representations into an existing representations relation
 */
function mergeInterestedPartyRepresentations(
	existing: Prisma.RepresentationCreateNestedManyWithoutAppealInput | undefined,
	incoming: Prisma.RepresentationCreateWithoutAppealInput[]
): { create: Prisma.RepresentationCreateWithoutAppealInput[] } {
	if (!existing?.create) {
		return { create: incoming };
	}
	const existingCreate = Array.isArray(existing.create) ? existing.create : [existing.create];
	return {
		create: [...(existingCreate as Prisma.RepresentationCreateWithoutAppealInput[]), ...incoming]
	};
}

/**
 * Build representations array from submitted date fields
 */
function buildRepresentations(source: AppealHas | AppealS78) {
	const entries: { representationType: string; dateCreated: Date }[] = [];

	const addEntry = (type: string, dateField: string | null | undefined) => {
		const date = parseDateOrUndefined(dateField);
		if (date) entries.push({ representationType: type, dateCreated: date });
	};

	const s78 = source as AppealS78;
	addEntry(APPEAL_REPRESENTATION_TYPE.APPELLANT_FINAL_COMMENT, s78.appellantCommentsSubmittedDate);
	addEntry(APPEAL_REPRESENTATION_TYPE.APPELLANT_STATEMENT, s78.appellantStatementSubmittedDate);
	addEntry(APPEAL_REPRESENTATION_TYPE.APPELLANT_PROOFS_EVIDENCE, s78.appellantProofsSubmittedDate);
	addEntry(APPEAL_REPRESENTATION_TYPE.LPA_FINAL_COMMENT, s78.lpaCommentsSubmittedDate);
	addEntry(APPEAL_REPRESENTATION_TYPE.LPA_PROOFS_EVIDENCE, s78.lpaProofsSubmittedDate);
	addEntry(APPEAL_REPRESENTATION_TYPE.LPA_STATEMENT, s78.lpaStatementSubmittedDate);

	if (entries.length === 0) return undefined;
	return { create: entries };
}

/**
 * Build default folders for a case
 */
function buildFolders() {
	return {
		create: FOLDERS.map((path) => ({ path }))
	};
}

/**
 * Build appeal grounds from enforcement appeal grounds details JSON array
 */
function buildAppealGrounds(source: AppealHas | AppealS78) {
	if (!('enforcementAppealGroundsDetails' in source)) return undefined;

	type GroundDetail = { appealGroundLetter?: string | null; groundFacts?: string | null };
	const grounds = parseJsonArray<GroundDetail>(
		source.enforcementAppealGroundsDetails,
		'enforcementAppealGroundsDetails'
	);

	const entries = grounds
		.filter((g) => g.appealGroundLetter)
		.map((g) => ({
			ground: { connect: { groundRef: g.appealGroundLetter as string } },
			factsForGround: g.groundFacts ?? ''
		}));

	if (entries.length === 0) return undefined;
	return { create: entries };
}

/**
 * Build designated sites relation
 */
function buildDesignatedSites(source: AppealHas | AppealS78) {
	const sites = parseJsonArray<string>(
		source.designatedSitesNames as string | null | undefined,
		'designatedSitesNames'
	);
	if (sites.length === 0) return undefined;
	return {
		create: sites.map((key) => ({
			designatedSite: { connect: { key } }
		}))
	};
}

/**
 * Build LPA questionnaire object
 */
function buildLpaQuestionnaire(source: AppealHas | AppealS78, validationReasonLookups: ValidationReasonLookups) {
	const s78 = source as AppealS78;
	const create = {
		lpaQuestionnaireSubmittedDate: parseDateOrUndefined(source.lpaQuestionnaireSubmittedDate),
		lpaqCreatedDate: parseDateOrUndefined(source.lpaQuestionnaireCreatedDate),
		lpaStatement: stringOrUndefined(source.lpaStatement),
		newConditionDetails: stringOrUndefined(source.newConditionDetails),
		siteAccessDetails: stringOrUndefined(source.siteAccessDetails),
		siteSafetyDetails: stringOrUndefined(source.siteSafetyDetails),
		isCorrectAppealType: source.isCorrectAppealType ?? undefined,
		inConservationArea: source.inConservationArea ?? undefined,
		affectsScheduledMonument: source.affectsScheduledMonument ?? undefined,
		isAonbNationalLandscape: source.isAonbNationalLandscape ?? undefined,
		hasProtectedSpecies: source.hasProtectedSpecies ?? undefined,
		hasInfrastructureLevy: source.hasInfrastructureLevy ?? undefined,
		isInfrastructureLevyFormallyAdopted: source.isInfrastructureLevyFormallyAdopted ?? undefined,
		infrastructureLevyAdoptedDate: parseDateOrUndefined(source.infrastructureLevyAdoptedDate),
		infrastructureLevyExpectedDate: parseDateOrUndefined(source.infrastructureLevyExpectedDate),
		lpaProcedurePreference: stringOrUndefined(source.lpaProcedurePreference),
		lpaProcedurePreferenceDetails: stringOrUndefined(source.lpaProcedurePreferenceDetails),
		lpaProcedurePreferenceDuration: parseNumber(source.lpaProcedurePreferenceDuration),
		reasonForNeighbourVisits: stringOrUndefined(source.reasonForNeighbourVisits),
		lpaCostsAppliedFor: source.lpaCostsAppliedFor ?? undefined,
		dateCostsReportDespatched: parseDateOrUndefined(source.dateCostsReportDespatched),
		dateNotRecoveredOrDerecovered: parseDateOrUndefined(source.dateNotRecoveredOrDerecovered),
		dateRecovered: parseDateOrUndefined(source.dateRecovered),
		originalCaseDecisionDate: parseDateOrUndefined(source.originalCaseDecisionDate),
		targetDate: parseDateOrUndefined(source.targetDate),
		importantInformation: stringOrUndefined(source.importantInformation),
		redeterminedIndicator: source.redeterminedIndicator == null ? undefined : String(source.redeterminedIndicator),
		isSiteInAreaOfSpecialControlAdverts: source.isSiteInAreaOfSpecialControlAdverts ?? undefined,
		wasApplicationRefusedDueToHighwayOrTraffic: source.wasApplicationRefusedDueToHighwayOrTraffic ?? undefined,
		didAppellantSubmitCompletePhotosAndPlans: source.didAppellantSubmitCompletePhotosAndPlans ?? undefined,

		// S78-specific fields
		isGypsyOrTravellerSite: booleanOrUndefined(s78.isGypsyOrTravellerSite),
		isPublicRightOfWay: booleanOrUndefined(s78.isPublicRightOfWay),
		siteWithinSSSI: booleanOrUndefined(s78.siteWithinSSSI),
		eiaEnvironmentalImpactSchedule: stringOrUndefined(s78.eiaEnvironmentalImpactSchedule),
		eiaDevelopmentDescription: stringOrUndefined(s78.eiaDevelopmentDescription),
		eiaSensitiveAreaDetails: stringOrUndefined(s78.eiaSensitiveAreaDetails),
		eiaColumnTwoThreshold: booleanOrUndefined(s78.eiaColumnTwoThreshold),
		eiaScreeningOpinion: booleanOrUndefined(s78.eiaScreeningOpinion),
		eiaRequiresEnvironmentalStatement: booleanOrUndefined(s78.eiaRequiresEnvironmentalStatement),
		eiaCompletedEnvironmentalStatement: booleanOrUndefined(s78.eiaCompletedEnvironmentalStatement),
		consultedBodiesDetails: stringOrUndefined(s78.consultedBodiesDetails),
		hasStatutoryConsultees: booleanOrUndefined(s78.hasStatutoryConsultees),
		siteNoticesSentDate: parseDateOrUndefined(s78.siteNoticesSentDate),

		// Enforcement fields
		noticeRelatesToBuildingEngineeringMiningOther: booleanOrUndefined(
			s78.noticeRelatesToBuildingEngineeringMiningOther
		),
		areaOfAllegedBreachInSquareMetres: parseNumber(s78.areaOfAllegedBreachInSquareMetres),
		doesAllegedBreachCreateFloorSpace: booleanOrUndefined(s78.doesAllegedBreachCreateFloorSpace),
		floorSpaceCreatedByBreachInSquareMetres: parseNumber(s78.floorSpaceCreatedByBreachInSquareMetres),
		changeOfUseRefuseOrWaste: booleanOrUndefined(s78.changeOfUseRefuseOrWaste),
		changeOfUseMineralExtraction: booleanOrUndefined(s78.changeOfUseMineralExtraction),
		changeOfUseMineralStorage: booleanOrUndefined(s78.changeOfUseMineralStorage),
		relatesToErectionOfBuildingOrBuildings: booleanOrUndefined(s78.relatesToErectionOfBuildingOrBuildings),
		relatesToBuildingWithAgriculturalPurpose: booleanOrUndefined(s78.relatesToBuildingWithAgriculturalPurpose),
		relatesToBuildingSingleDwellingHouse: booleanOrUndefined(s78.relatesToBuildingSingleDwellingHouse),
		affectedTrunkRoadName: stringOrUndefined(s78.affectedTrunkRoadName),
		isSiteOnCrownLand: booleanOrUndefined(s78.isSiteOnCrownLand),
		article4AffectedDevelopmentRights: stringOrUndefined(s78.article4AffectedDevelopmentRights),

		// S20 fields
		historicEnglandConsultation: booleanOrUndefined(s78.consultHistoricEngland),
		preserveGrantLoan: booleanOrUndefined(s78.preserveGrantLoan),

		// Relations
		lpaQuestionnaireValidationOutcome: buildLpaValidationOutcome(source),
		lpaQuestionnaireIncompleteReasonsSelected:
			buildValidationReasons<Prisma.LPAQuestionnaireIncompleteReasonsSelectedCreateWithoutLpaQuestionnaireInput>(
				source.lpaQuestionnaireValidationDetails,
				validationReasonLookups.lpaIncomplete,
				VALIDATION_REASON_CONFIGS.lpaIncomplete
			),
		lpaNotificationMethods: buildLpaNotificationMethods(source),
		listedBuildingDetails: buildListedBuildingDetails(source),
		designatedSiteNames: buildDesignatedSites(source)
	};

	if (!Object.values(create).some((v) => v !== undefined)) return undefined;

	return { create };
}

/**
 * Build inspector decision object
 */
function buildInspectorDecision(source: AppealHas | AppealS78) {
	if (!source.caseDecisionOutcome) return undefined;

	return {
		create: {
			outcome: source.caseDecisionOutcome,
			caseDecisionOutcomeDate: parseDateOrUndefined(source.caseDecisionOutcomeDate)
		}
	};
}

/**
 * Helper to connect to a lookup table by name field
 */
function connectLookupByName(value: string | null | undefined): { connect: { name: string } } | undefined {
	if (!value) return undefined;
	return { connect: { name: value } };
}

/**
 * Helper to connect to a lookup table by key field
 */
function connectLookupByKey(value: string | null | undefined): { connect: { key: string } } | undefined {
	if (!value) return undefined;
	return { connect: { key: value } };
}

const buildAppealType = connectLookupByKey;
const buildProcedureType = connectLookupByKey;

/**
 * Type for validation reason configuration
 */
type ValidationReasonConfig = {
	fieldName: string;
	reasonField: 'appellantCaseIncompleteReason' | 'appellantCaseInvalidReason' | 'lpaQuestionnaireIncompleteReason';
	textField:
		| 'appellantCaseIncompleteReasonText'
		| 'appellantCaseInvalidReasonText'
		| 'lpaQuestionnaireIncompleteReasonText';
};

/**
 * Configuration constants for validation reason mapping
 */
const VALIDATION_REASON_CONFIGS: Record<string, ValidationReasonConfig> = {
	incomplete: {
		fieldName: 'caseValidationIncompleteDetails',
		reasonField: 'appellantCaseIncompleteReason',
		textField: 'appellantCaseIncompleteReasonText'
	},
	invalid: {
		fieldName: 'caseValidationInvalidDetails',
		reasonField: 'appellantCaseInvalidReason',
		textField: 'appellantCaseInvalidReasonText'
	},
	lpaIncomplete: {
		fieldName: 'lpaQuestionnaireValidationDetails',
		reasonField: 'lpaQuestionnaireIncompleteReason',
		textField: 'lpaQuestionnaireIncompleteReasonText'
	}
};

/**
 * Generic helper to build validation reasons (incomplete or invalid)
 *
 * Reverse engineering from back-office map-case-validation.js:
 * - Back-office converts: reasonsSelected → validationDetails
 * - Format: reason.name or "reason.name: text" (if hasText)
 *
 * Migration reverses this:
 * - Parse strings like "Reason name: Additional info" or "Reason name"
 * - Split on ":" to separate reason name from optional text
 * - Look up reason by name in the specified table to get ID
 * - Create relation with optional text
 */
function buildValidationReasons<ValidationInput>(
	details: string | null | undefined,
	reasonLookupMap: Map<string, number>,
	config: ValidationReasonConfig
): { create: ValidationInput[] } | undefined {
	const parsedDetails = parseJsonArray<string>(details, config.fieldName);

	if (parsedDetails.length === 0) return undefined;

	// Build validation input array
	const validationInputs = parsedDetails.map((detail) => {
		const colonIndex = detail.indexOf(':');
		const reasonName = colonIndex > -1 ? detail.substring(0, colonIndex).trim() : detail.trim();
		const text = colonIndex > -1 ? detail.substring(colonIndex + 1).trim() : null;

		// Look up reason from pre-fetched map
		const reasonId = reasonLookupMap.get(reasonName);
		if (!reasonId) {
			throw new Error(
				`Unknown ${config.fieldName.replace('caseValidation', '').toLowerCase()} reason: "${reasonName}".`
			);
		}

		return {
			[config.reasonField]: { connect: { id: reasonId } },
			[config.textField]: text ? { create: [{ text }] } : undefined
		} as ValidationInput;
	});

	return { create: validationInputs };
}

/**
 * Build advert details relation from source advert details
 */
function buildAdvertDetails(
	source: AppealHas | AppealS78
): { create: Prisma.AppellantCaseAdvertDetailsCreateWithoutAppellantCaseInput[] } | undefined {
	type AdvertDetail = NonNullable<NonNullable<Schemas.AppealHASCase['advertDetails']>[number]>;

	const advertDetails = parseJsonArray<AdvertDetail>(source.advertDetails, 'advertDetails');

	if (advertDetails.length === 0) return undefined;

	return {
		create: advertDetails.map((advert) => ({
			// Note: advertType mapping is not implemented as mentioned (always null)
			// advertType: { connect: { name: advert.advertType } },
			advertInPosition: advert.isAdvertInPosition ?? false,
			highwayLand: advert.isSiteOnHighwayLand ?? false
		}))
	};
}

/**
 * Build appellant case object with all appellant-submitted information
 */
/**
 * Converts occupancy conditions met boolean to permission string.
 *
 * @param occupancyConditionsMet - Whether occupancy conditions were met
 * @returns 'yes', 'no', or undefined
 */
function convertOccupancyConditionsToPermission(
	occupancyConditionsMet: boolean | null | undefined
): 'yes' | 'no' | undefined {
	if (occupancyConditionsMet === null || occupancyConditionsMet === undefined) {
		return undefined;
	}
	return occupancyConditionsMet ? 'yes' : 'no';
}

function buildAppellantCase(
	source: AppealHas | AppealS78,
	validationReasonLookups: ValidationReasonLookups
): { create: Prisma.AppellantCaseCreateWithoutAppealInput } | undefined {
	// Build validation reasons using pre-fetched lookup maps
	const incompleteReasons =
		buildValidationReasons<Prisma.AppellantCaseIncompleteReasonsSelectedCreateWithoutAppellantCaseInput>(
			source.caseValidationIncompleteDetails,
			validationReasonLookups.incomplete,
			VALIDATION_REASON_CONFIGS.incomplete
		);
	const invalidReasons =
		buildValidationReasons<Prisma.AppellantCaseInvalidReasonsSelectedCreateWithoutAppellantCaseInput>(
			source.caseValidationInvalidDetails,
			validationReasonLookups.invalid,
			VALIDATION_REASON_CONFIGS.invalid
		);

	// AppellantCase is required for all appeals, so we always create it
	const caseSubmittedDate = parseDateOrUndefined(source.caseSubmittedDate);
	if (!caseSubmittedDate) {
		throw new Error(
			`Missing required field caseSubmittedDate for case ${source.caseReference}. Cannot create appellant case without submission date.`
		);
	}

	const applicationDecision = stringOrUndefined(source.applicationDecision);
	if (!applicationDecision) {
		throw new Error(
			`Missing required field applicationDecision for case ${source.caseReference}. Cannot create appellant case without application decision.`
		);
	}

	const s78 = source as AppealS78;

	return {
		create: {
			// Submission dates
			caseSubmittedDate,
			caseSubmissionDueDate: parseDateOrUndefined(source.caseSubmissionDueDate),

			// Validation
			appellantCaseValidationOutcome: connectLookupByName(source.caseValidationOutcome),
			appellantCaseIncompleteReasonsSelected: incompleteReasons,
			appellantCaseInvalidReasonsSelected: invalidReasons,

			// Application details
			applicationDate: parseDateOrUndefined(source.applicationDate),
			applicationDecision,
			applicationDecisionDate: parseDateOrUndefined(source.applicationDecisionDate),

			// Site details
			siteAccessDetails: stringOrUndefined(source.siteAccessDetails),
			siteSafetyDetails: stringOrUndefined(source.siteSafetyDetails),
			siteAreaSquareMetres: parseNumber(source.siteAreaSquareMetres),
			floorSpaceSquareMetres: parseNumber(source.floorSpaceSquareMetres),

			// Land ownership
			ownsAllLand: source.ownsAllLand,
			ownsSomeLand: source.ownsSomeLand,
			knowsOtherOwners: connectLookupByName(source.knowsOtherOwners),
			knowsAllOwners: connectLookupByName(source.knowsAllOwners),
			ownersInformed: source.ownersInformed,

			// Notification
			hasAdvertisedAppeal: source.advertisedAppeal,

			// Development description
			originalDevelopmentDescription: stringOrUndefined(source.originalDevelopmentDescription),
			changedDevelopmentDescription: source.changedDevelopmentDescription,

			enforcementNotice: source.enforcementNotice,

			isGreenBelt: source.isGreenBelt,

			typeOfPlanningApplication: stringOrUndefined(source.typeOfPlanningApplication),

			caseworkReason: stringOrUndefined(source.caseworkReason),

			jurisdiction: stringOrUndefined(source.jurisdiction),

			siteGridReferenceEasting: stringOrUndefined(source.siteGridReferenceEasting),
			siteGridReferenceNorthing: stringOrUndefined(source.siteGridReferenceNorthing),

			landownerPermission: source.hasLandownersPermission,

			appellantCostsAppliedFor: source.appellantCostsAppliedFor,

			// Advert details relation. This follows the Prisma convention where
			// the relation name in the create input matches the field name in the model.
			appellantCaseAdvertDetails: buildAdvertDetails(source),

			// AppealS78-specific fields
			enforcementIssueDate: parseDateOrUndefined(s78.issueDateOfEnforcementNotice),
			enforcementEffectiveDate: parseDateOrUndefined(s78.effectiveDateOfEnforcementNotice),
			interestInLand: stringOrUndefined(s78.ownerOccupancyStatus),
			writtenOrVerbalPermission: convertOccupancyConditionsToPermission(s78.occupancyConditionsMet),
			appellantProcedurePreference: stringOrUndefined(s78.appellantProcedurePreference),
			appellantProcedurePreferenceDetails: stringOrUndefined(s78.appellantProcedurePreferenceDetails),
			appellantProcedurePreferenceDuration: parseNumber(s78.appellantProcedurePreferenceDuration),
			appellantProcedurePreferenceWitnessCount: parseNumber(s78.appellantProcedurePreferenceWitnessCount),
			statusPlanningObligation: stringOrUndefined(s78.statusPlanningObligation),
			agriculturalHolding: s78.agriculturalHolding,
			tenantAgriculturalHolding: s78.tenantAgriculturalHolding,
			otherTenantsAgriculturalHolding: s78.otherTenantsAgriculturalHolding,
			informedTenantsAgriculturalHolding: s78.informedTenantsAgriculturalHolding,
			applicationDecisionAppealed: s78.didAppellantAppealLpaDecision,
			enforcementReference: stringOrUndefined(s78.enforcementNoticeReference),
			descriptionOfAllegedBreach: stringOrUndefined(s78.descriptionOfAllegedBreach),
			contactPlanningInspectorateDate: parseDateOrUndefined(s78.dateAppellantContactedPins),
			applicationMadeAndFeePaid: s78.applicationMadeAndFeePaid,
			applicationDevelopmentAllOrPart: stringOrUndefined(s78.applicationPartOrWholeDevelopment),
			developmentType: stringOrUndefined(s78.developmentType),
			numberOfResidencesNetChange: parseNumber(s78.numberOfResidencesNetChange),
			siteViewableFromRoad: s78.siteViewableFromRoad,
			appealDecisionDate: parseDateOrUndefined(s78.dateLpaDecisionReceived)
		}
	};
}

/**
 * Build generic user connection with connectOrCreate
 */
function buildUserConnection(userId: string | null | undefined) {
	if (!userId) return;
	return {
		connectOrCreate: {
			where: { azureAdUserId: userId },
			create: { azureAdUserId: userId }
		}
	};
}

/**
 * Build parent appeal relation for linked cases where this case is the child
 */
function buildParentAppealRelation(source: AppealHas | AppealS78) {
	if (source.linkedCaseStatus !== 'child') return undefined;

	if (!source.leadCaseReference) {
		throw new Error(
			`Case ${source.caseReference} has linkedCaseStatus='child' but is missing leadCaseReference. Data integrity issue.`
		);
	}

	if (!source.caseReference) return undefined;

	return {
		create: [
			{
				type: 'linked',
				parentRef: source.leadCaseReference,
				childRef: source.caseReference
			}
		]
	};
}

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

export type ValidationReasonLookups = {
	incomplete: Map<string, number>;
	invalid: Map<string, number>;
	lpaIncomplete: Map<string, number>;
};

/**
 * Main function to map AppealHas source data to sink database
 */
export function mapSourceToSinkAppeal(
	sourceCase: AppealHas | AppealS78,
	validationReasonLookups: ValidationReasonLookups,
	events?: AppealEvent[],
	serviceUsers?: AppealServiceUser[]
): Prisma.AppealCreateInput {
	// Validate required fields
	if (!sourceCase.caseReference) {
		throw new Error('caseReference is required');
	}
	if (!sourceCase.lpaCode) {
		throw new Error('lpaCode is required');
	}

	// Build the core appeal mapping
	const coreAppeal: Prisma.AppealCreateInput = {
		reference: sourceCase.caseReference,
		submissionId: stringOrUndefined(sourceCase.submissionId),
		// In the source (AppealHas), the field is called caseType
		// In the sink (Appeal model), the relation is called appealType
		appealType: buildAppealType(sourceCase.caseType),
		procedureType: buildProcedureType(sourceCase.caseProcedure),
		caseOfficer: buildUserConnection(sourceCase.caseOfficerId),
		inspector: buildUserConnection(sourceCase.inspectorId),
		padsInspector: buildPadsInspector(sourceCase.padsSapId),

		applicationReference: stringOrUndefined(sourceCase.applicationReference),
		caseCreatedDate: parseDateOrUndefined(sourceCase.caseCreatedDate),
		caseUpdatedDate: parseDateOrUndefined(sourceCase.caseUpdatedDate),
		caseValidDate: parseDateOrUndefined(sourceCase.caseValidDate),
		caseExtensionDate: parseDateOrUndefined(sourceCase.caseExtensionDate),
		caseStartedDate: parseDateOrUndefined(sourceCase.caseStartedDate),
		casePublishedDate: parseDateOrUndefined(sourceCase.casePublishedDate),

		lpa: {
			connect: { lpaCode: sourceCase.lpaCode }
		},

		appealTimetable: buildAppealTimetable(sourceCase),
		allocation: buildAppealAllocation(sourceCase),
		appealStatus: buildAppealStatus(sourceCase),
		specialisms: buildAppealSpecialisms(sourceCase),
		address: buildAddress(sourceCase),
		inspectorDecision: buildInspectorDecision(sourceCase),
		appellantCase: buildAppellantCase(sourceCase, validationReasonLookups),
		childAppeals: parseNearbyCaseReferences(sourceCase.caseReference, sourceCase.nearbyCaseReferences),
		parentAppeals: buildParentAppealRelation(sourceCase),
		neighbouringSites: parseNeighbouringSiteAddresses(sourceCase),
		lpaQuestionnaire: buildLpaQuestionnaire(sourceCase, validationReasonLookups),
		representations: buildRepresentations(sourceCase),
		appealGrounds: buildAppealGrounds(sourceCase),
		folders: buildFolders()
	};

	// Helper function to add event if not duplicate
	const addEventIfNotDuplicate = (
		eventType: 'hearing' | 'inquiry' | 'siteVisit',
		eventData:
			| { create: Prisma.HearingCreateWithoutAppealInput }
			| { create: Prisma.InquiryCreateWithoutAppealInput }
			| { create: Prisma.SiteVisitCreateWithoutAppealInput }
	) => {
		if (coreAppeal[eventType]) {
			throw new Error(
				`Duplicate ${eventType} event found for case ${sourceCase.caseReference}. Cannot map multiple events of the same type.`
			);
		}
		(coreAppeal as Record<string, unknown>)[eventType] = eventData;
	};

	// If events are provided, merge event mappings
	if (events && events.length > 0) {
		// Each appeal can have at most one of each type due to @unique constraints
		for (const event of events) {
			const eventMapping = mapEventToSink(event);

			if (eventMapping.hearing) addEventIfNotDuplicate('hearing', eventMapping.hearing);
			if (eventMapping.inquiry) addEventIfNotDuplicate('inquiry', eventMapping.inquiry);
			if (eventMapping.siteVisit) addEventIfNotDuplicate('siteVisit', eventMapping.siteVisit);
		}
	}

	// Helper function to add unique service user
	const addUniqueServiceUser = (userType: 'appellant' | 'agent', userData: Prisma.ServiceUserCreateInput) => {
		if (coreAppeal[userType]) {
			throw new Error(
				`Duplicate ${userType} found for case ${sourceCase.caseReference}. Cannot map multiple ${userType}s.`
			);
		}
		coreAppeal[userType] = { create: userData };
	};

	// Map service users to appellant, agent, interested party, and rule 6 party relations
	if (serviceUsers && serviceUsers.length > 0) {
		const serviceUserRelations = mapServiceUsersToAppealRelations(serviceUsers);

		if (serviceUserRelations.appellant) {
			addUniqueServiceUser('appellant', serviceUserRelations.appellant);
		}

		if (serviceUserRelations.agent) {
			addUniqueServiceUser('agent', serviceUserRelations.agent);
		}

		if (
			serviceUserRelations.interestedPartyRepresentations &&
			serviceUserRelations.interestedPartyRepresentations.length > 0
		) {
			coreAppeal.representations = mergeInterestedPartyRepresentations(
				coreAppeal.representations,
				serviceUserRelations.interestedPartyRepresentations
			);
		}

		if (serviceUserRelations.rule6Parties && serviceUserRelations.rule6Parties.length > 0) {
			coreAppeal.appealRule6Parties = { create: serviceUserRelations.rule6Parties };
		}
	}

	return coreAppeal;
}
