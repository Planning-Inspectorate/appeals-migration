import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import type {
	AppealEvent,
	AppealHas,
	AppealS78,
	AppealServiceUser
} from '@pins/odw-curated-database/src/client/client.ts';
import type { Schemas } from '@planning-inspectorate/data-model';
import { APPEAL_CASE_STATUS } from '@planning-inspectorate/data-model';
import { parseDateOrUndefined, parseJsonArray, parseNumber, stringOrUndefined } from '../../shared/helpers/index.ts';
import { mapEventToSink } from './map-event-to-sink.ts';
import { mapServiceUsersToAppealRelations } from './map-service-user.ts';

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
	const lpaQuestionnaireDueDate = parseDateOrUndefined(source.lpaQuestionnaireDueDate);

	// Only create timetable if at least one date exists
	if (!lpaQuestionnaireDueDate) {
		return undefined;
	}

	return {
		create: {
			lpaQuestionnaireDueDate
		}
	};
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
	const listedBuildingNumbers = parseJsonArray<string>(
		source.affectedListedBuildingNumbers,
		'affectedListedBuildingNumbers'
	);
	if (listedBuildingNumbers.length === 0) return undefined;
	return {
		create: listedBuildingNumbers.map((listEntry) => ({ listEntry }))
	};
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
function buildLpaQuestionnaire(source: AppealHas | AppealS78) {
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
		lpaQuestionnaireValidationOutcome: buildLpaValidationOutcome(source),
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
 * Configuration constants for validation reason mapping
 */
const VALIDATION_REASON_CONFIGS = {
	incomplete: {
		fieldName: 'caseValidationIncompleteDetails',
		tableName: 'appellantCaseIncompleteReason',
		reasonField: 'appellantCaseIncompleteReason',
		textField: 'appellantCaseIncompleteReasonText'
	},
	invalid: {
		fieldName: 'caseValidationInvalidDetails',
		tableName: 'appellantCaseInvalidReason',
		reasonField: 'appellantCaseInvalidReason',
		textField: 'appellantCaseInvalidReasonText'
	}
} as const;

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
	config: {
		fieldName: string;
		reasonField: 'appellantCaseIncompleteReason' | 'appellantCaseInvalidReason';
		textField: 'appellantCaseIncompleteReasonText' | 'appellantCaseInvalidReasonText';
	}
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
			appellantCaseAdvertDetails: buildAdvertDetails(source)
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
		neighbouringSites: parseNeighbouringSiteAddresses(sourceCase),
		lpaQuestionnaire: buildLpaQuestionnaire(sourceCase)
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

	// Map service users to appellant and agent relations
	if (serviceUsers && serviceUsers.length > 0) {
		const serviceUserRelations = mapServiceUsersToAppealRelations(serviceUsers);

		if (serviceUserRelations.appellant) {
			addUniqueServiceUser('appellant', serviceUserRelations.appellant);
		}

		if (serviceUserRelations.agent) {
			addUniqueServiceUser('agent', serviceUserRelations.agent);
		}
	}

	return coreAppeal;
}
