import type {
	AppealEvent,
	AppealHas,
	AppealS78,
	AppealServiceUser
} from '@pins/odw-curated-database/src/client/client.ts';
import { APPEAL_CASE_STATUS } from '@planning-inspectorate/data-model';
import { mapEventToSink } from '../../b-migrate-data/mappers/map-event-to-sink.ts';
import { getServiceUserRole, mapServiceUser } from '../../b-migrate-data/mappers/map-service-user.ts';
import { APPEAL_REPRESENTATION_TYPE } from '../../b-migrate-data/mappers/map-source-to-sink.ts';
import { parseDateOrUndefined, parseJsonArray, parseNumber, stringOrUndefined } from '../../shared/helpers/index.ts';
import type { fetchSinkCaseDetails } from '../sink/case-details.ts';

export type SourceCase = { type: 'has'; data: AppealHas } | { type: 's78'; data: AppealS78 };
type SinkCase = NonNullable<Awaited<ReturnType<typeof fetchSinkCaseDetails>>>;

function compareMappedString(sourceValue: string | null | undefined, sinkValue: string | null | undefined): boolean {
	return stringOrUndefined(sourceValue) === (sinkValue ?? undefined);
}

function compareMappedDate(
	sourceValue: string | Date | null | undefined,
	sinkValue: string | Date | null | undefined
): boolean {
	const mapped = parseDateOrUndefined(sourceValue);
	const sinkDate = parseDateOrUndefined(sinkValue);
	if (mapped === undefined && sinkDate === undefined) return true;
	if (mapped === undefined || sinkDate === undefined) return false;
	return mapped.getTime() === sinkDate.getTime();
}

function compareMappedNumber(
	sourceValue: Parameters<typeof parseNumber>[0],
	sinkValue: number | null | undefined
): boolean {
	return (parseNumber(sourceValue) ?? null) === (sinkValue ?? null);
}

function validateArrayMatch<S, T>(
	expected: S[],
	sinkItems: T[],
	getExpectedKey: (item: S) => string | null | undefined,
	getSinkKey: (item: T) => string | null | undefined
): boolean {
	if (expected.length !== sinkItems.length) return false;
	return expected.every((e) => sinkItems.some((s) => getSinkKey(s) === getExpectedKey(e)));
}

function validateAppealTimetable(source: AppealHas | AppealS78, sink: SinkCase['appealTimetable']): boolean {
	const s78 = source as AppealS78;
	const shouldExist = [
		source.lpaQuestionnaireDueDate,
		s78.planningObligationDueDate,
		s78.finalCommentsDueDate,
		s78.interestedPartyRepsDueDate,
		s78.proofsOfEvidenceDueDate,
		s78.statementDueDate,
		s78.statementOfCommonGroundDueDate
	].some((v) => parseDateOrUndefined(v) !== undefined);

	if (!shouldExist && !sink) return true;
	if (!sink) return false;

	return (
		compareMappedDate(source.lpaQuestionnaireDueDate, sink.lpaQuestionnaireDueDate) &&
		compareMappedDate(s78.planningObligationDueDate, sink.planningObligationDueDate) &&
		compareMappedDate(s78.finalCommentsDueDate, sink.finalCommentsDueDate) &&
		compareMappedDate(s78.interestedPartyRepsDueDate, sink.ipCommentsDueDate) &&
		compareMappedDate(s78.proofsOfEvidenceDueDate, sink.proofOfEvidenceAndWitnessesDueDate) &&
		compareMappedDate(s78.statementDueDate, sink.lpaStatementDueDate) &&
		compareMappedDate(s78.statementOfCommonGroundDueDate, sink.statementOfCommonGroundDueDate)
	);
}

function validateAllocation(source: AppealHas | AppealS78, sink: SinkCase['allocation']): boolean {
	if (!source.allocationLevel || parseNumber(source.allocationBand) === undefined) return !sink;
	if (!sink) return false;
	return sink.level === source.allocationLevel && compareMappedNumber(source.allocationBand, sink.band);
}

function validateAppealStatus(source: AppealHas | AppealS78, sinkStatuses: SinkCase['appealStatus']): boolean {
	const expected: Array<{ status: string; createdAt: Date | undefined }> = [];

	if (source.caseStatus) {
		expected.push({
			status: source.caseStatus,
			createdAt: parseDateOrUndefined(source.caseUpdatedDate)
		});
	}

	if (source.caseValidationDate) {
		expected.push({
			status: APPEAL_CASE_STATUS.READY_TO_START,
			createdAt: parseDateOrUndefined(source.caseValidationDate)
		});
	}

	if (source.lpaQuestionnairePublishedDate) {
		expected.push({
			status: APPEAL_CASE_STATUS.EVENT,
			createdAt: parseDateOrUndefined(source.lpaQuestionnairePublishedDate)
		});
	}

	if (source.caseWithdrawnDate) {
		expected.push({
			status: APPEAL_CASE_STATUS.WITHDRAWN,
			createdAt: parseDateOrUndefined(source.caseWithdrawnDate)
		});
	}

	if (source.caseTransferredDate) {
		expected.push({
			status: APPEAL_CASE_STATUS.TRANSFERRED,
			createdAt: parseDateOrUndefined(source.caseTransferredDate)
		});
	}

	if (source.transferredCaseClosedDate) {
		expected.push({
			status: APPEAL_CASE_STATUS.CLOSED,
			createdAt: parseDateOrUndefined(source.transferredCaseClosedDate)
		});
	}

	if (source.caseCompletedDate) {
		expected.push({
			status: APPEAL_CASE_STATUS.COMPLETE,
			createdAt: parseDateOrUndefined(source.caseCompletedDate)
		});
	}

	if (sinkStatuses.length !== expected.length) return false;

	return expected.every((exp) =>
		sinkStatuses.some((sink) => sink.status === exp.status && compareMappedDate(exp.createdAt, sink.createdAt))
	);
}

function validateSpecialisms(source: AppealHas | AppealS78, sinkSpecialisms: SinkCase['specialisms']): boolean {
	const expected = [...new Set(parseJsonArray<string>(source.caseSpecialisms, 'specialisms').filter(Boolean))];
	return validateArrayMatch(
		expected,
		sinkSpecialisms,
		(name) => name,
		(s) => s.specialism.name
	);
}

function validateAddress(source: AppealHas | AppealS78, sink: SinkCase['address']): boolean {
	if (!source.siteAddressLine1) return !sink;
	if (!sink) return false;
	return (
		sink.addressLine1 === source.siteAddressLine1 &&
		compareMappedString(source.siteAddressLine2, sink.addressLine2) &&
		compareMappedString(source.siteAddressTown, sink.addressTown) &&
		compareMappedString(source.siteAddressCounty, sink.addressCounty) &&
		compareMappedString(source.siteAddressPostcode, sink.postcode)
	);
}

function validateInspectorDecision(source: AppealHas | AppealS78, sink: SinkCase['inspectorDecision']): boolean {
	if (!source.caseDecisionOutcome) return !sink;
	if (!sink) return false;
	return (
		sink.outcome === source.caseDecisionOutcome &&
		compareMappedDate(source.caseDecisionOutcomeDate, sink.caseDecisionOutcomeDate)
	);
}

function validateAppellantCase(source: AppealHas | AppealS78, sink: SinkCase['appellantCase']): boolean {
	if (!sink) return false;
	const s78 = source as AppealS78;
	return (
		compareMappedDate(source.caseSubmittedDate, sink.caseSubmittedDate) &&
		compareMappedString(source.applicationDecision, sink.applicationDecision) &&
		compareMappedDate(source.applicationDate, sink.applicationDate) &&
		compareMappedDate(source.applicationDecisionDate, sink.applicationDecisionDate) &&
		compareMappedString(source.siteAccessDetails, sink.siteAccessDetails) &&
		compareMappedString(source.siteSafetyDetails, sink.siteSafetyDetails) &&
		compareMappedString(source.originalDevelopmentDescription, sink.originalDevelopmentDescription) &&
		(sink.ownsAllLand ?? null) === (source.ownsAllLand ?? null) &&
		(sink.ownsSomeLand ?? null) === (source.ownsSomeLand ?? null) &&
		compareMappedString(source.typeOfPlanningApplication, sink.typeOfPlanningApplication) &&
		compareMappedString(source.jurisdiction, sink.jurisdiction) &&
		compareMappedDate(s78.issueDateOfEnforcementNotice, sink.enforcementIssueDate) &&
		compareMappedString(s78.ownerOccupancyStatus, sink.interestInLand) &&
		compareMappedString(s78.appellantProcedurePreference, sink.appellantProcedurePreference) &&
		compareMappedNumber(s78.appellantProcedurePreferenceDuration, sink.appellantProcedurePreferenceDuration)
	);
}

function validateChildAppeals(source: AppealHas | AppealS78, sinkAppeals: SinkCase['childAppeals']): boolean {
	const refs = parseJsonArray<string>(source.nearbyCaseReferences, 'nearbyCaseReferences');
	return validateArrayMatch(
		refs,
		sinkAppeals,
		(ref) => ref.trim(),
		(s) => s.childRef
	);
}

function validateNeighbouringSites(source: AppealHas | AppealS78, sinkSites: SinkCase['neighbouringSites']): boolean {
	type Addr = { neighbouringSiteAddressLine1?: string | null };
	const addrs = parseJsonArray<Addr>(source.neighbouringSiteAddresses, 'neighbouringSiteAddresses');
	return validateArrayMatch(
		addrs,
		sinkSites,
		(a) => a.neighbouringSiteAddressLine1 ?? null,
		(s) => s.address?.addressLine1 ?? null
	);
}

function validateLpaQuestionnaire(source: AppealHas | AppealS78, sink: SinkCase['lpaQuestionnaire']): boolean {
	const shouldExist = [
		parseDateOrUndefined(source.lpaQuestionnaireSubmittedDate),
		parseDateOrUndefined(source.lpaQuestionnaireCreatedDate),
		stringOrUndefined(source.lpaStatement),
		source.isCorrectAppealType ?? undefined,
		source.inConservationArea ?? undefined,
		stringOrUndefined(source.lpaProcedurePreference),
		stringOrUndefined(source.importantInformation),
		parseDateOrUndefined(source.targetDate)
	].some((v) => v !== undefined);

	if (!shouldExist && !sink) return true;
	if (!sink) return false;

	return (
		compareMappedDate(source.lpaQuestionnaireSubmittedDate, sink.lpaQuestionnaireSubmittedDate) &&
		compareMappedString(source.lpaStatement, sink.lpaStatement) &&
		compareMappedString(source.lpaProcedurePreference, sink.lpaProcedurePreference) &&
		compareMappedString(source.importantInformation, sink.importantInformation) &&
		(sink.isCorrectAppealType ?? null) === (source.isCorrectAppealType ?? null) &&
		(sink.inConservationArea ?? null) === (source.inConservationArea ?? null) &&
		compareMappedDate(source.targetDate, sink.targetDate) &&
		validateLpaNotificationMethods(source, sink.lpaNotificationMethods) &&
		validateListedBuildingDetails(source, sink.listedBuildingDetails) &&
		validateDesignatedSiteNames(source, sink.designatedSiteNames)
	);
}

function validateLpaNotificationMethods(
	source: AppealHas | AppealS78,
	sinkMethods: SinkCase['lpaQuestionnaire'] extends null | undefined
		? never
		: NonNullable<SinkCase['lpaQuestionnaire']>['lpaNotificationMethods']
): boolean {
	const expected = parseJsonArray<string>(source.notificationMethod, 'notificationMethod');
	return validateArrayMatch(
		expected,
		sinkMethods,
		(key) => key,
		(m) => m.lpaNotificationMethod.key
	);
}

function validateListedBuildingDetails(
	source: AppealHas | AppealS78,
	sinkDetails: SinkCase['lpaQuestionnaire'] extends null | undefined
		? never
		: NonNullable<SinkCase['lpaQuestionnaire']>['listedBuildingDetails']
): boolean {
	const affected = parseJsonArray<string>(source.affectedListedBuildingNumbers, 'affectedListedBuildingNumbers');
	const changed = parseJsonArray<string>(
		(source as AppealS78).changedListedBuildingNumbers,
		'changedListedBuildingNumbers'
	);
	return validateArrayMatch(
		[...affected, ...changed],
		sinkDetails,
		(entry) => entry,
		(d) => d.listEntry
	);
}

function validateDesignatedSiteNames(
	source: AppealHas | AppealS78,
	sinkNames: SinkCase['lpaQuestionnaire'] extends null | undefined
		? never
		: NonNullable<SinkCase['lpaQuestionnaire']>['designatedSiteNames']
): boolean {
	const expected = parseJsonArray<string>(
		source.designatedSitesNames as string | null | undefined,
		'designatedSitesNames'
	);
	return validateArrayMatch(
		expected,
		sinkNames,
		(key) => key,
		(n) => n.designatedSite.key
	);
}

function validateRepresentations(source: AppealHas | AppealS78, sinkReps: SinkCase['representations']): boolean {
	const s78 = source as AppealS78;
	const expected: string[] = [];
	const addIfDate = (type: string, date: string | null | undefined) => {
		if (parseDateOrUndefined(date)) expected.push(type);
	};
	addIfDate(APPEAL_REPRESENTATION_TYPE.APPELLANT_FINAL_COMMENT, s78.appellantCommentsSubmittedDate);
	addIfDate(APPEAL_REPRESENTATION_TYPE.APPELLANT_STATEMENT, s78.appellantStatementSubmittedDate);
	addIfDate(APPEAL_REPRESENTATION_TYPE.APPELLANT_PROOFS_EVIDENCE, s78.appellantProofsSubmittedDate);
	addIfDate(APPEAL_REPRESENTATION_TYPE.LPA_FINAL_COMMENT, s78.lpaCommentsSubmittedDate);
	addIfDate(APPEAL_REPRESENTATION_TYPE.LPA_PROOFS_EVIDENCE, s78.lpaProofsSubmittedDate);
	addIfDate(APPEAL_REPRESENTATION_TYPE.LPA_STATEMENT, s78.lpaStatementSubmittedDate);
	if (expected.length !== sinkReps.length) return false;
	return expected.every((type) => sinkReps.some((r) => r.representationType === type));
}

function validateAppealGrounds(source: AppealHas | AppealS78, sinkGrounds: SinkCase['appealGrounds']): boolean {
	if (!('enforcementAppealGroundsDetails' in source)) return sinkGrounds.length === 0;
	type GroundDetail = { appealGroundLetter?: string | null };
	const grounds = parseJsonArray<GroundDetail>(
		source.enforcementAppealGroundsDetails,
		'enforcementAppealGroundsDetails'
	);
	const expected = grounds.filter((g) => g.appealGroundLetter).map((g) => g.appealGroundLetter as string);
	if (expected.length !== sinkGrounds.length) return false;
	return expected.every((ref) => sinkGrounds.some((g) => g.ground?.groundRef === ref));
}

function validateEventAddress(
	mappedAddress:
		| {
				addressLine1?: string | null;
				addressLine2?: string | null;
				addressTown?: string | null;
				addressCounty?: string | null;
				postcode?: string | null;
		  }
		| undefined,
	sinkAddress: {
		addressLine1: string | null;
		addressLine2: string | null;
		addressTown: string | null;
		addressCounty: string | null;
		postcode: string | null;
	} | null
): boolean {
	if (!mappedAddress && !sinkAddress) return true;
	if (!mappedAddress || !sinkAddress) return false;
	return (
		compareMappedString(mappedAddress.addressLine1, sinkAddress.addressLine1) &&
		compareMappedString(mappedAddress.addressLine2, sinkAddress.addressLine2) &&
		compareMappedString(mappedAddress.addressTown, sinkAddress.addressTown) &&
		compareMappedString(mappedAddress.addressCounty, sinkAddress.addressCounty) &&
		compareMappedString(mappedAddress.postcode, sinkAddress.postcode)
	);
}

function validateEvents(events: AppealEvent[], sink: SinkCase): boolean {
	let hasSourceHearing = false;
	let hasSourceInquiry = false;
	let hasSourceSiteVisit = false;

	for (const event of events) {
		const mapped = mapEventToSink(event);
		if (mapped.hearing) {
			hasSourceHearing = true;
			if (!sink.hearing) return false;
			const hearing = mapped.hearing.create;
			if (!compareMappedDate(hearing.hearingStartTime, sink.hearing.hearingStartTime)) return false;
			if (!compareMappedDate(hearing.hearingEndTime, sink.hearing.hearingEndTime)) return false;
			if (!validateEventAddress(hearing.address?.create, sink.hearing.address)) return false;
		} else if (mapped.inquiry) {
			hasSourceInquiry = true;
			if (!sink.inquiry) return false;
			const inquiry = mapped.inquiry.create;
			if (!compareMappedDate(inquiry.inquiryStartTime, sink.inquiry.inquiryStartTime)) return false;
			if (!compareMappedDate(inquiry.inquiryEndTime, sink.inquiry.inquiryEndTime)) return false;
			if (!validateEventAddress(inquiry.address?.create, sink.inquiry.address)) return false;
		} else if (mapped.siteVisit) {
			hasSourceSiteVisit = true;
			if (!sink.siteVisit || !sink.siteVisit.visitDate || !mapped.siteVisit.create.visitDate) return false;
			if (!compareMappedDate(mapped.siteVisit.create.visitDate, sink.siteVisit.visitDate)) return false;
		}
	}

	if (sink.hearing && !hasSourceHearing) return false;
	if (sink.inquiry && !hasSourceInquiry) return false;
	if (sink.siteVisit && !hasSourceSiteVisit) return false;

	return true;
}

function validateServiceUser(
	sinkUser: SinkCase['appellant'] | SinkCase['agent'],
	sourceUser: AppealServiceUser
): boolean {
	if (!sinkUser) return false;
	const mapped = mapServiceUser(sourceUser);

	const baseFieldsMatch =
		(sinkUser.firstName ?? undefined) === mapped.firstName &&
		(sinkUser.lastName ?? undefined) === mapped.lastName &&
		(sinkUser.email ?? undefined) === mapped.email &&
		(sinkUser.phoneNumber ?? undefined) === mapped.phoneNumber;

	if (!baseFieldsMatch) return false;

	const mappedAddress = mapped.address?.create;
	const sinkAddress = sinkUser.address;

	if (!mappedAddress && !sinkAddress) return true;
	if (!mappedAddress || !sinkAddress) return false;

	return (
		(sinkAddress.addressLine1 ?? undefined) === mappedAddress.addressLine1 &&
		(sinkAddress.addressLine2 ?? undefined) === mappedAddress.addressLine2 &&
		(sinkAddress.addressTown ?? undefined) === mappedAddress.addressTown &&
		(sinkAddress.addressCounty ?? undefined) === mappedAddress.addressCounty &&
		(sinkAddress.postcode ?? undefined) === mappedAddress.postcode &&
		(sinkAddress.addressCountry ?? undefined) === mappedAddress.addressCountry
	);
}

function validateServiceUsers(serviceUsers: AppealServiceUser[], sink: SinkCase): boolean {
	const appellant = serviceUsers.find((user) => getServiceUserRole(user).isAppellant);
	const agent = serviceUsers.find((user) => getServiceUserRole(user).isAgent);

	if (appellant && !validateServiceUser(sink.appellant, appellant)) return false;
	if (!appellant && sink.appellant) return false;
	if (agent && !validateServiceUser(sink.agent, agent)) return false;
	if (!agent && sink.agent) return false;
	return true;
}

export function validateData(
	sourceCase: SourceCase,
	sinkCase: SinkCase,
	events: AppealEvent[] = [],
	serviceUsers: AppealServiceUser[] = []
): boolean {
	const source = sourceCase.data;

	return (
		sinkCase.reference === source.caseReference &&
		compareMappedString(source.submissionId, sinkCase.submissionId) &&
		compareMappedString(source.applicationReference, sinkCase.applicationReference) &&
		compareMappedDate(source.caseCreatedDate, sinkCase.caseCreatedDate) &&
		compareMappedDate(source.caseUpdatedDate, sinkCase.caseUpdatedDate) &&
		compareMappedDate(source.caseValidDate, sinkCase.caseValidDate) &&
		compareMappedDate(source.caseExtensionDate, sinkCase.caseExtensionDate) &&
		compareMappedDate(source.caseStartedDate, sinkCase.caseStartedDate) &&
		compareMappedDate(source.casePublishedDate, sinkCase.casePublishedDate) &&
		validateAppealTimetable(source, sinkCase.appealTimetable) &&
		validateAllocation(source, sinkCase.allocation) &&
		validateAppealStatus(source, sinkCase.appealStatus) &&
		validateSpecialisms(source, sinkCase.specialisms) &&
		validateAddress(source, sinkCase.address) &&
		validateInspectorDecision(source, sinkCase.inspectorDecision) &&
		validateAppellantCase(source, sinkCase.appellantCase) &&
		validateChildAppeals(source, sinkCase.childAppeals) &&
		validateNeighbouringSites(source, sinkCase.neighbouringSites) &&
		validateLpaQuestionnaire(source, sinkCase.lpaQuestionnaire) &&
		validateRepresentations(source, sinkCase.representations) &&
		validateAppealGrounds(source, sinkCase.appealGrounds) &&
		validateEvents(events, sinkCase) &&
		validateServiceUsers(serviceUsers, sinkCase)
	);
}
