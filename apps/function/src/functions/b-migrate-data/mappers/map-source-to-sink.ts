import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import type {
	AppealEvent,
	AppealHas,
	AppealS78,
	AppealServiceUser
} from '@pins/odw-curated-database/src/client/client.ts';
import type { Schemas } from '@planning-inspectorate/data-model';
import { APPEAL_CASE_STATUS } from '@planning-inspectorate/data-model';
import { parseDateOrUndefined, parseNumber, stringOrUndefined } from '../../shared/helpers/index.ts';
import { mapEventToSink } from './map-event-to-sink.ts';
import { mapServiceUsersToAppealRelations } from './map-service-user.ts';

/**
 * Generic JSON array parser with error handling
 * Parses a JSON string into an array, with validation
 */
function parseJsonArray<T = unknown>(jsonString: string | null | undefined, fieldName: string): T[] {
	if (!jsonString) return [];

	try {
		const parsed = JSON.parse(jsonString);
		if (!Array.isArray(parsed)) {
			throw new Error(`Expected JSON array for ${fieldName}, got: ${typeof parsed}`);
		}
		return parsed;
	} catch (error) {
		throw new Error(
			`Invalid JSON for ${fieldName}: ${jsonString}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
			{ cause: error }
		);
	}
}

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
function parseNeighbouringSiteAddresses(neighbouringAddresses: string | null | undefined) {
	const addresses = parseJsonArray<NonNullable<Schemas.AppealHASCase['neighbouringSiteAddresses']>[number]>(
		neighbouringAddresses,
		'neighbouringSiteAddresses'
	);

	if (addresses.length === 0) return undefined;

	return {
		create: addresses.map(buildNeighbouringSiteAddress)
	};
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

	// Add historical statuses in chronological order
	addUniqueStatus(APPEAL_CASE_STATUS.READY_TO_START, source.caseValidationDate, false);
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
	if (specialisms.length === 0) return undefined;

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
	const caseResubmissionDueDate = parseDateOrUndefined(source.caseSubmissionDueDate);

	// Only create timetable if at least one date exists
	if (!lpaQuestionnaireDueDate && !caseResubmissionDueDate) {
		return undefined;
	}

	return {
		create: {
			lpaQuestionnaireDueDate,
			caseResubmissionDueDate
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
 * Parse comma-separated string into trimmed, non-empty array
 */
function parseCommaSeparated(value: string | null | undefined): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map((v) => v.trim())
		.filter(Boolean);
}

/**
 * Build LPA questionnaire object
 */
function buildLpaQuestionnaire(source: AppealHas | AppealS78) {
	const submittedDate = parseDateOrUndefined(source.lpaQuestionnaireSubmittedDate);
	const createdDate = parseDateOrUndefined(source.lpaQuestionnaireCreatedDate);
	const lpaStatement = stringOrUndefined(source.lpaStatement);
	const newConditionDetails = stringOrUndefined(source.newConditionDetails);
	const siteAccessDetails = stringOrUndefined(source.siteAccessDetails);
	const siteSafetyDetails = stringOrUndefined(source.siteSafetyDetails);
	const lpaProcedurePreference = stringOrUndefined(source.lpaProcedurePreference);
	const lpaProcedurePreferenceDetails = stringOrUndefined(source.lpaProcedurePreferenceDetails);
	const lpaProcedurePreferenceDuration = parseNumber(source.lpaProcedurePreferenceDuration);
	const reasonForNeighbourVisits = stringOrUndefined(source.reasonForNeighbourVisits);
	const importantInformation = stringOrUndefined(source.importantInformation);
	const designatedSiteNameCustom = stringOrUndefined(source.designatedSitesNames as string | null | undefined);

	const validationOutcome = stringOrUndefined(source.lpaQuestionnaireValidationOutcome);
	const notificationMethods = parseCommaSeparated(source.notificationMethod);
	const listedBuildingNumbers = parseCommaSeparated(source.affectedListedBuildingNumbers);

	const hasAnyData =
		submittedDate ||
		createdDate ||
		lpaStatement ||
		newConditionDetails ||
		siteAccessDetails ||
		siteSafetyDetails ||
		source.isCorrectAppealType !== null ||
		source.inConservationArea !== null ||
		source.isGreenBelt !== null ||
		source.affectsScheduledMonument !== null ||
		source.isAonbNationalLandscape !== null ||
		source.hasProtectedSpecies !== null ||
		source.hasInfrastructureLevy !== null ||
		source.isInfrastructureLevyFormallyAdopted !== null ||
		parseDateOrUndefined(source.infrastructureLevyAdoptedDate) ||
		parseDateOrUndefined(source.infrastructureLevyExpectedDate) ||
		lpaProcedurePreference ||
		lpaProcedurePreferenceDetails ||
		lpaProcedurePreferenceDuration !== undefined ||
		reasonForNeighbourVisits ||
		source.lpaCostsAppliedFor !== null ||
		parseDateOrUndefined(source.dateCostsReportDespatched) ||
		parseDateOrUndefined(source.dateNotRecoveredOrDerecovered) ||
		parseDateOrUndefined(source.dateRecovered) ||
		parseDateOrUndefined(source.originalCaseDecisionDate) ||
		parseDateOrUndefined(source.targetDate) ||
		parseDateOrUndefined(source.lpaQuestionnairePublishedDate) ||
		importantInformation ||
		source.redeterminedIndicator !== null ||
		source.isSiteInAreaOfSpecialControlAdverts !== null ||
		source.wasApplicationRefusedDueToHighwayOrTraffic !== null ||
		source.didAppellantSubmitCompletePhotosAndPlans !== null ||
		designatedSiteNameCustom ||
		validationOutcome ||
		notificationMethods.length > 0 ||
		listedBuildingNumbers.length > 0;

	if (!hasAnyData) return undefined;

	return {
		create: {
			lpaQuestionnaireSubmittedDate: submittedDate,
			...(createdDate && { lpaqCreatedDate: createdDate }),
			lpaStatement,
			newConditionDetails,
			siteAccessDetails,
			siteSafetyDetails,
			isCorrectAppealType: source.isCorrectAppealType ?? undefined,
			inConservationArea: source.inConservationArea ?? undefined,
			isGreenBelt: source.isGreenBelt ?? undefined,
			affectsScheduledMonument: source.affectsScheduledMonument ?? undefined,
			isAonbNationalLandscape: source.isAonbNationalLandscape ?? undefined,
			hasProtectedSpecies: source.hasProtectedSpecies ?? undefined,
			hasInfrastructureLevy: source.hasInfrastructureLevy ?? undefined,
			isInfrastructureLevyFormallyAdopted: source.isInfrastructureLevyFormallyAdopted ?? undefined,
			infrastructureLevyAdoptedDate: parseDateOrUndefined(source.infrastructureLevyAdoptedDate),
			infrastructureLevyExpectedDate: parseDateOrUndefined(source.infrastructureLevyExpectedDate),
			lpaProcedurePreference,
			lpaProcedurePreferenceDetails,
			lpaProcedurePreferenceDuration,
			reasonForNeighbourVisits,
			lpaCostsAppliedFor: source.lpaCostsAppliedFor ?? undefined,
			dateCostsReportDespatched: parseDateOrUndefined(source.dateCostsReportDespatched),
			dateNotRecoveredOrDerecovered: parseDateOrUndefined(source.dateNotRecoveredOrDerecovered),
			dateRecovered: parseDateOrUndefined(source.dateRecovered),
			originalCaseDecisionDate: parseDateOrUndefined(source.originalCaseDecisionDate),
			targetDate: parseDateOrUndefined(source.targetDate),
			siteNoticesSentDate: parseDateOrUndefined(source.lpaQuestionnairePublishedDate),
			importantInformation,
			redeterminedIndicator: source.redeterminedIndicator == null ? undefined : String(source.redeterminedIndicator),
			isSiteInAreaOfSpecialControlAdverts: source.isSiteInAreaOfSpecialControlAdverts ?? undefined,
			wasApplicationRefusedDueToHighwayOrTraffic: source.wasApplicationRefusedDueToHighwayOrTraffic ?? undefined,
			didAppellantSubmitCompletePhotosAndPlans: source.didAppellantSubmitCompletePhotosAndPlans ?? undefined,
			designatedSiteNameCustom,
			...(validationOutcome && {
				lpaQuestionnaireValidationOutcome: { connect: { name: validationOutcome } }
			}),
			...(notificationMethods.length > 0 && {
				lpaNotificationMethods: {
					create: notificationMethods.map((key) => ({
						lpaNotificationMethod: { connect: { key } }
					}))
				}
			}),
			...(listedBuildingNumbers.length > 0 && {
				listedBuildingDetails: {
					create: listedBuildingNumbers.map((reference) => ({
						listedBuilding: { connect: { reference } }
					}))
				}
			})
		}
	};
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

/**
 * Build appeal type and procedure relations
 */
function buildAppealType(caseType: string | null | undefined) {
	if (!caseType) return;
	return { connect: { key: caseType } };
}

function buildProcedureType(caseProcedure: string | null | undefined) {
	if (!caseProcedure) return;
	return { connect: { key: caseProcedure } };
}

/**
 * Main function to map AppealHas source data to sink database
 */
export function mapSourceToSinkAppeal(
	sourceCase: AppealHas | AppealS78,
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
		caseCompletedDate: parseDateOrUndefined(sourceCase.caseCompletedDate),
		withdrawalRequestDate: parseDateOrUndefined(sourceCase.caseWithdrawnDate),

		lpa: {
			connect: { lpaCode: sourceCase.lpaCode }
		},

		appealTimetable: buildAppealTimetable(sourceCase),
		allocation: buildAppealAllocation(sourceCase),
		appealStatus: buildAppealStatus(sourceCase),
		specialisms: buildAppealSpecialisms(sourceCase),
		address: buildAddress(sourceCase),
		inspectorDecision: buildInspectorDecision(sourceCase),
		childAppeals: parseNearbyCaseReferences(sourceCase.caseReference, sourceCase.nearbyCaseReferences),
		neighbouringSites: parseNeighbouringSiteAddresses(sourceCase.neighbouringSiteAddresses),
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
