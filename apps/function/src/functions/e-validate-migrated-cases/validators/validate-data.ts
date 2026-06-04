import type {
	AppealEvent,
	AppealHas,
	AppealS78,
	AppealServiceUser
} from '@pins/odw-curated-database/src/client/client.ts';
import { APPEAL_CASE_STATUS, type Schemas } from '@planning-inspectorate/data-model';
import {
	mapCaseDecisionOutcome,
	mapCaseProcedure,
	mapCaseStatus,
	mapCaseValidationOutcome,
	mapDevelopmentType,
	mapTypeOfPlanningApplication
} from '../../b-migrate-data/mappers/map-enum.ts';
import { mapEventToSink } from '../../b-migrate-data/mappers/map-event-to-sink.ts';
import { mapLpaInTest } from '../../b-migrate-data/mappers/map-lpa.ts';
import { getServiceUserRole, mapServiceUser } from '../../b-migrate-data/mappers/map-service-user.ts';
import { APPEAL_REPRESENTATION_TYPE } from '../../b-migrate-data/mappers/map-source-to-sink.ts';
import { parseDateOrZero } from '../../shared/helpers/date.ts';
import { parseDateOrUndefined, parseJsonArray, parseNumber, stringOrUndefined } from '../../shared/helpers/index.ts';
import type { fetchSinkCaseDetails } from '../sink/case-details.ts';
import type { DataValidationResult, ValidationError } from '../types/validation-types.ts';
import { createValidationError } from '../types/validation-types.ts';

export type SourceCase = { type: 'has'; data: AppealHas } | { type: 's78'; data: AppealS78 };
type SinkCase = NonNullable<Awaited<ReturnType<typeof fetchSinkCaseDetails>>>;

interface ValidationResult {
	isValid: boolean;
	errors: string[];
}

export function compareMappedString(
	sourceValue: string | null | undefined,
	sinkValue: string | null | undefined,
	ignoreCase?: boolean
): boolean {
	const getValue = (value: string | null | undefined) => {
		const s = stringOrUndefined(value);
		if (ignoreCase) {
			return s?.toLowerCase();
		}
		return s;
	};
	return getValue(sourceValue) === getValue(sinkValue);
}

export function compareMappedDate(
	sourceValue: string | Date | null | undefined,
	sinkValue: string | Date | null | undefined,
	zeroDate?: boolean
): boolean {
	const mapped = zeroDate ? parseDateOrZero(sourceValue) : parseDateOrUndefined(sourceValue);
	const sinkDate = parseDateOrUndefined(sinkValue);
	if (mapped === undefined && sinkDate === undefined) return true;
	if (mapped === undefined || sinkDate === undefined) return false;
	return mapped.getTime() === sinkDate.getTime();
}

export function compareMappedNumber(
	sourceValue: Parameters<typeof parseNumber>[0],
	sinkValue: number | null | undefined
): boolean {
	return (parseNumber(sourceValue) ?? null) === (sinkValue ?? null);
}

function validateArrayMatch<S, T>(
	expected: S[],
	sinkItems: T[],
	getExpectedKey: (item: S) => string | null | undefined,
	getSinkKey: (item: T) => string | null | undefined,
	label: string
): ValidationResult {
	const validationErrors: string[] = [];
	if (expected.length !== sinkItems.length) {
		validationErrors.push(`${label}: expected ${expected.length} items but found ${sinkItems.length}`);
		return { isValid: false, errors: validationErrors };
	}
	const expectedKeys = expected.map(getExpectedKey).sort();
	const sinkKeys = sinkItems.map(getSinkKey).sort();
	const mismatched = expectedKeys.filter((key, i) => key !== sinkKeys[i]);
	if (mismatched.length > 0) {
		validationErrors.push(`${label}: expected keys [${expectedKeys.join(', ')}] got [${sinkKeys.join(', ')}]`);
	}
	return { isValid: validationErrors.length === 0, errors: validationErrors };
}

function validateAppealTimetable(source: AppealHas | AppealS78, sink: SinkCase['appealTimetable']): ValidationResult {
	const validationErrors: string[] = [];
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

	if (!shouldExist && !sink) return { isValid: true, errors: [] };
	if (!sink) {
		validationErrors.push('appealTimetable is missing in sink but expected to exist');
		return { isValid: false, errors: validationErrors };
	}

	const dateChecks: Array<{ field: string; source: string | Date | null | undefined; sink: Date | null }> = [
		{ field: 'lpaQuestionnaireDueDate', source: source.lpaQuestionnaireDueDate, sink: sink.lpaQuestionnaireDueDate },
		{ field: 'planningObligationDueDate', source: s78.planningObligationDueDate, sink: sink.planningObligationDueDate },
		{ field: 'finalCommentsDueDate', source: s78.finalCommentsDueDate, sink: sink.finalCommentsDueDate },
		{ field: 'interestedPartyRepsDueDate', source: s78.interestedPartyRepsDueDate, sink: sink.ipCommentsDueDate },
		{
			field: 'proofsOfEvidenceDueDate',
			source: s78.proofsOfEvidenceDueDate,
			sink: sink.proofOfEvidenceAndWitnessesDueDate
		},
		{ field: 'statementDueDate', source: s78.statementDueDate, sink: sink.lpaStatementDueDate },
		{
			field: 'statementOfCommonGroundDueDate',
			source: s78.statementOfCommonGroundDueDate,
			sink: sink.statementOfCommonGroundDueDate
		}
	];

	dateChecks.forEach(({ field, source: srcVal, sink: sinkVal }) => {
		if (!compareMappedDate(srcVal, sinkVal)) {
			validationErrors.push(`${field}: expected '${srcVal ?? 'null'}' got '${sinkVal?.toISOString() ?? 'null'}'`);
		}
	});

	return { isValid: validationErrors.length === 0, errors: validationErrors };
}

function validateAllocation(source: AppealHas | AppealS78, sink: SinkCase['allocation']): ValidationResult {
	const validationErrors: string[] = [];

	if (!source.allocationLevel || parseNumber(source.allocationBand) === undefined) {
		if (sink) {
			validationErrors.push('allocation exists in sink but source has no allocation data');
		}
		return { isValid: validationErrors.length === 0, errors: validationErrors };
	}

	if (!sink) {
		validationErrors.push('allocation is missing in sink');
		return { isValid: false, errors: validationErrors };
	}

	if (sink.level !== source.allocationLevel) {
		validationErrors.push(`level: expected '${source.allocationLevel}' got '${sink.level ?? 'null'}'`);
	}
	if (!compareMappedNumber(source.allocationBand, sink.band)) {
		validationErrors.push(`band: expected '${source.allocationBand ?? 'null'}' got '${sink.band ?? 'null'}'`);
	}

	return { isValid: validationErrors.length === 0, errors: validationErrors };
}

function addStatusIfDateExists(
	expected: Array<{ status: string; createdAt: Date | undefined }>,
	status: string,
	date: string | Date | null | undefined
): void {
	const parsedDate = parseDateOrUndefined(date);
	if (parsedDate !== undefined) {
		expected.push({ status, createdAt: parsedDate });
	}
}

function validateAppealStatus(source: AppealHas | AppealS78, sinkStatuses: SinkCase['appealStatus']): ValidationResult {
	const validationErrors: string[] = [];
	const expected: Array<{ status: string; createdAt: Date | undefined }> = [];

	const statusMappings: Array<{ status: string; dateField: string | Date | null | undefined }> = [
		{ status: mapCaseStatus(source.caseStatus || '')!, dateField: source.caseUpdatedDate },
		{ status: APPEAL_CASE_STATUS.READY_TO_START, dateField: source.caseValidationDate },
		{ status: APPEAL_CASE_STATUS.EVENT, dateField: source.lpaQuestionnairePublishedDate },
		{ status: APPEAL_CASE_STATUS.WITHDRAWN, dateField: source.caseWithdrawnDate },
		{ status: APPEAL_CASE_STATUS.TRANSFERRED, dateField: source.caseTransferredDate },
		{ status: APPEAL_CASE_STATUS.CLOSED, dateField: source.transferredCaseClosedDate },
		{ status: APPEAL_CASE_STATUS.COMPLETE, dateField: source.caseCompletedDate }
	];

	statusMappings.forEach(({ status, dateField }) => {
		if (status) {
			addStatusIfDateExists(expected, status, dateField);
		}
	});

	// Check count mismatch
	if (sinkStatuses.length !== expected.length) {
		validationErrors.push(
			`Expected ${expected.length} appeal statuses but found ${sinkStatuses.length}. Expected statuses: ${expected
				.map((e) => e.status)
				.sort()
				.join(', ')}`
		);
	}

	// Sort for deterministic comparison
	const sortedExpected = [...expected].sort((a, b) => a.status.localeCompare(b.status));
	const sortedSink = [...sinkStatuses].sort((a, b) => (a.status ?? '').localeCompare(b.status ?? ''));

	// Check for missing or mismatched statuses
	const missingStatuses = sortedExpected.filter(
		(exp) => !sortedSink.some((sink) => sink.status === exp.status && compareMappedDate(exp.createdAt, sink.createdAt))
	);

	missingStatuses.forEach((missing) => {
		validationErrors.push(
			`Status '${missing.status}' with creation date '${missing.createdAt?.toISOString() ?? 'null'}' not found in sink or dates do not match`
		);
	});

	// Check for unexpected statuses in sink
	const unexpectedStatuses = sortedSink.filter(
		(sink) =>
			!sortedExpected.some(
				(exp) => exp.status === sink.status && compareMappedDate(exp.createdAt, sink.createdAt, true)
			)
	);

	unexpectedStatuses.forEach((unexpected) => {
		validationErrors.push(
			`Unexpected status '${unexpected.status}' found in sink with creation date '${unexpected.createdAt?.toISOString() ?? 'null'}'`
		);
	});

	return {
		isValid: validationErrors.length === 0,
		errors: validationErrors
	};
}

function validateSpecialisms(
	source: AppealHas | AppealS78,
	sinkSpecialisms: SinkCase['specialisms']
): ValidationResult {
	const expected = [...new Set(parseJsonArray<string>(source.caseSpecialisms, 'specialisms').filter(Boolean))];
	return validateArrayMatch(
		expected,
		sinkSpecialisms,
		(name) => name.toLowerCase(),
		(s) => s.specialism.name.toLowerCase(),
		'specialisms'
	);
}

function compareAddressFields(
	sourceLine1: string | null | undefined,
	sourceLine2: string | null | undefined,
	sourceTown: string | null | undefined,
	sourceCounty: string | null | undefined,
	sourcePostcode: string | null | undefined,
	sinkAddress: {
		addressLine1: string | null;
		addressLine2: string | null;
		addressTown: string | null;
		addressCounty: string | null;
		postcode: string | null;
	} | null
): boolean {
	if (!sinkAddress) return false;
	return (
		compareMappedString(sourceLine1, sinkAddress.addressLine1) &&
		compareMappedString(sourceLine2, sinkAddress.addressLine2) &&
		compareMappedString(sourceTown, sinkAddress.addressTown) &&
		compareMappedString(sourceCounty, sinkAddress.addressCounty) &&
		compareMappedString(sourcePostcode, sinkAddress.postcode)
	);
}

function validateAddress(source: AppealHas | AppealS78, sink: SinkCase['address']): ValidationResult {
	const validationErrors: string[] = [];

	if (!source.siteAddressLine1) {
		if (sink) {
			validationErrors.push('address exists in sink but source has no siteAddressLine1');
		}
		return { isValid: validationErrors.length === 0, errors: validationErrors };
	}

	if (!sink) {
		validationErrors.push('address is missing in sink');
		return { isValid: false, errors: validationErrors };
	}

	const checks: Array<{ field: string; source: string | null | undefined; sink: string | null }> = [
		{ field: 'addressLine1', source: source.siteAddressLine1, sink: sink.addressLine1 },
		{ field: 'addressLine2', source: source.siteAddressLine2, sink: sink.addressLine2 },
		{ field: 'addressTown', source: source.siteAddressTown, sink: sink.addressTown },
		{ field: 'addressCounty', source: source.siteAddressCounty, sink: sink.addressCounty },
		{ field: 'postcode', source: source.siteAddressPostcode, sink: sink.postcode }
	];

	checks.forEach(({ field, source: srcVal, sink: sinkVal }) => {
		if (!compareMappedString(srcVal, sinkVal)) {
			validationErrors.push(`${field}: expected '${srcVal ?? 'null'}' got '${sinkVal ?? 'null'}'`);
		}
	});

	return { isValid: validationErrors.length === 0, errors: validationErrors };
}

function validateInspectorDecision(
	source: AppealHas | AppealS78,
	sink: SinkCase['inspectorDecision']
): ValidationResult {
	const validationErrors: string[] = [];

	if (!source.caseDecisionOutcome) {
		if (sink) {
			validationErrors.push('inspectorDecision exists in sink but source has no caseDecisionOutcome');
		}
		return { isValid: validationErrors.length === 0, errors: validationErrors };
	}

	if (!sink) {
		validationErrors.push('inspectorDecision is missing in sink');
		return { isValid: false, errors: validationErrors };
	}

	const expectedOutcome = mapCaseDecisionOutcome(source.caseDecisionOutcome);
	if (sink.outcome !== expectedOutcome) {
		validationErrors.push(`outcome: expected '${expectedOutcome ?? 'null'}' got '${sink.outcome ?? 'null'}'`);
	}
	if (!compareMappedDate(source.caseDecisionOutcomeDate, sink.caseDecisionOutcomeDate)) {
		validationErrors.push(
			`caseDecisionOutcomeDate: expected '${source.caseDecisionOutcomeDate ?? 'null'}' got '${sink.caseDecisionOutcomeDate?.toISOString() ?? 'null'}'`
		);
	}

	return { isValid: validationErrors.length === 0, errors: validationErrors };
}

function validateAppellantCase(source: AppealHas | AppealS78, sink: SinkCase['appellantCase']): ValidationResult {
	const validationErrors: string[] = [];

	if (!sink) {
		validationErrors.push('appellantCase is missing in sink');
		return { isValid: false, errors: validationErrors };
	}

	const s78 = source as AppealS78;

	if (!compareMappedDate(source.caseSubmittedDate, sink.caseSubmittedDate, true)) {
		validationErrors.push(
			`caseSubmittedDate: expected '${source.caseSubmittedDate ?? 'null'}' got '${sink.caseSubmittedDate?.toISOString() ?? 'null'}'`
		);
	}
	if (!compareMappedString(source.applicationDecision, sink.applicationDecision)) {
		validationErrors.push(
			`applicationDecision: expected '${source.applicationDecision ?? 'null'}' got '${sink.applicationDecision ?? 'null'}'`
		);
	}
	if (!compareMappedDate(source.applicationDate, sink.applicationDate, true)) {
		validationErrors.push(
			`applicationDate: expected '${source.applicationDate ?? 'null'}' got '${sink.applicationDate?.toISOString() ?? 'null'}'`
		);
	}
	if (!compareMappedDate(source.applicationDecisionDate, sink.applicationDecisionDate)) {
		validationErrors.push(
			`applicationDecisionDate: expected '${source.applicationDecisionDate ?? 'null'}' got '${sink.applicationDecisionDate?.toISOString() ?? 'null'}'`
		);
	}
	if (!compareMappedString(source.siteAccessDetails, sink.siteAccessDetails)) {
		validationErrors.push(
			`siteAccessDetails: expected '${source.siteAccessDetails ?? 'null'}' got '${sink.siteAccessDetails ?? 'null'}'`
		);
	}
	if (!compareMappedString(source.siteSafetyDetails, sink.siteSafetyDetails)) {
		validationErrors.push(
			`siteSafetyDetails: expected '${source.siteSafetyDetails ?? 'null'}' got '${sink.siteSafetyDetails ?? 'null'}'`
		);
	}
	if (!compareMappedString(source.originalDevelopmentDescription, sink.originalDevelopmentDescription)) {
		validationErrors.push(
			`originalDevelopmentDescription: expected '${source.originalDevelopmentDescription ?? 'null'}' got '${sink.originalDevelopmentDescription ?? 'null'}'`
		);
	}
	if ((sink.ownsAllLand ?? null) !== (source.ownsAllLand ?? null)) {
		validationErrors.push(
			`ownsAllLand: expected '${source.ownsAllLand ?? 'null'}' got '${sink.ownsAllLand ?? 'null'}'`
		);
	}
	if ((sink.ownsSomeLand ?? null) !== (source.ownsSomeLand ?? null)) {
		validationErrors.push(
			`ownsSomeLand: expected '${source.ownsSomeLand ?? 'null'}' got '${sink.ownsSomeLand ?? 'null'}'`
		);
	}
	const sourceTypeOfPlanningApplication = mapTypeOfPlanningApplication(source.typeOfPlanningApplication);
	if (!compareMappedString(sourceTypeOfPlanningApplication, sink.typeOfPlanningApplication)) {
		validationErrors.push(
			`typeOfPlanningApplication: expected '${sourceTypeOfPlanningApplication ?? 'null'}' got '${sink.typeOfPlanningApplication ?? 'null'}'`
		);
	}
	if (!compareMappedString(source.jurisdiction, sink.jurisdiction)) {
		validationErrors.push(
			`jurisdiction: expected '${source.jurisdiction ?? 'null'}' got '${sink.jurisdiction ?? 'null'}'`
		);
	}
	if (!compareMappedDate(s78.issueDateOfEnforcementNotice, sink.enforcementIssueDate)) {
		validationErrors.push(
			`enforcementIssueDate: expected '${s78.issueDateOfEnforcementNotice ?? 'null'}' got '${sink.enforcementIssueDate?.toISOString() ?? 'null'}'`
		);
	}
	if (!compareMappedString(s78.ownerOccupancyStatus, sink.interestInLand)) {
		validationErrors.push(
			`interestInLand: expected '${s78.ownerOccupancyStatus ?? 'null'}' got '${sink.interestInLand ?? 'null'}'`
		);
	}
	if (!compareMappedString(s78.appellantProcedurePreference, sink.appellantProcedurePreference)) {
		validationErrors.push(
			`appellantProcedurePreference: expected '${s78.appellantProcedurePreference ?? 'null'}' got '${sink.appellantProcedurePreference ?? 'null'}'`
		);
	}
	if (!compareMappedNumber(s78.appellantProcedurePreferenceDuration, sink.appellantProcedurePreferenceDuration)) {
		validationErrors.push(
			`appellantProcedurePreferenceDuration: expected '${s78.appellantProcedurePreferenceDuration ?? 'null'}' got '${sink.appellantProcedurePreferenceDuration ?? 'null'}'`
		);
	}
	const sourceDevelopmentType = mapDevelopmentType(s78.developmentType);
	if (!compareMappedString(sourceDevelopmentType, sink.developmentType)) {
		validationErrors.push(
			`developmentType: expected '${sourceDevelopmentType ?? 'null'}' got '${sink.developmentType ?? 'null'}'`
		);
	}
	const expectedWrittenOrVerbalPermission =
		s78.occupancyConditionsMet === null || s78.occupancyConditionsMet === undefined
			? undefined
			: s78.occupancyConditionsMet
				? 'yes'
				: 'no';
	if (!compareMappedString(expectedWrittenOrVerbalPermission, sink.writtenOrVerbalPermission)) {
		validationErrors.push(
			`writtenOrVerbalPermission: expected '${expectedWrittenOrVerbalPermission ?? 'null'}' got '${sink.writtenOrVerbalPermission ?? 'null'}'`
		);
	}
	const expectedValidationOutcome = mapCaseValidationOutcome(source.caseValidationOutcome);
	if (!compareMappedString(expectedValidationOutcome, sink.appellantCaseValidationOutcome?.name, true)) {
		validationErrors.push(
			`appellantCaseValidationOutcome: expected '${expectedValidationOutcome ?? 'null'}' got '${sink.appellantCaseValidationOutcome?.name ?? 'null'}'`
		);
	}

	return {
		isValid: validationErrors.length === 0,
		errors: validationErrors
	};
}

function validateChildAppeals(source: AppealHas | AppealS78, sinkAppeals: SinkCase['childAppeals']): ValidationResult {
	const refs = parseJsonArray<string>(source.nearbyCaseReferences, 'nearbyCaseReferences');
	return validateArrayMatch(
		refs,
		sinkAppeals,
		(ref) => ref.trim(),
		(s) => s.childRef,
		'childAppeals'
	);
}

function validateNeighbouringSites(
	source: AppealHas | AppealS78,
	sinkSites: SinkCase['neighbouringSites']
): ValidationResult {
	type Addr = NonNullable<Schemas.AppealHASCase['neighbouringSiteAddresses']>[number];
	const addrs = parseJsonArray<Addr>(source.neighbouringSiteAddresses, 'neighbouringSiteAddresses');
	return validateArrayMatch(
		addrs,
		sinkSites,
		(a) =>
			[
				a.neighbouringSiteAddressLine1 ?? '',
				a.neighbouringSiteAddressLine2 ?? '',
				a.neighbouringSiteAddressTown ?? '',
				a.neighbouringSiteAddressCounty ?? '',
				a.neighbouringSiteAddressPostcode ?? ''
			].join('|'),
		(s) =>
			[
				s.address?.addressLine1 ?? '',
				s.address?.addressLine2 ?? '',
				s.address?.addressTown ?? '',
				s.address?.addressCounty ?? '',
				s.address?.postcode ?? ''
			].join('|'),
		'neighbouringSites'
	);
}

function validateLpaQuestionnaire(source: AppealHas | AppealS78, sink: SinkCase['lpaQuestionnaire']): ValidationResult {
	const validationErrors: string[] = [];

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

	if (!shouldExist && !sink) return { isValid: true, errors: [] };
	if (!sink) {
		validationErrors.push('lpaQuestionnaire is missing in sink but expected to exist');
		return { isValid: false, errors: validationErrors };
	}

	if (!compareMappedDate(source.lpaQuestionnaireSubmittedDate, sink.lpaQuestionnaireSubmittedDate)) {
		validationErrors.push(
			`lpaQuestionnaireSubmittedDate: expected '${source.lpaQuestionnaireSubmittedDate ?? 'null'}' got '${sink.lpaQuestionnaireSubmittedDate?.toISOString() ?? 'null'}'`
		);
	}
	if (!compareMappedString(source.lpaStatement, sink.lpaStatement)) {
		validationErrors.push(
			`lpaStatement: expected '${source.lpaStatement ?? 'null'}' got '${sink.lpaStatement ?? 'null'}'`
		);
	}
	const sourceLpaProcedurePreference = mapCaseProcedure(source.lpaProcedurePreference);
	if (!compareMappedString(sourceLpaProcedurePreference, sink.lpaProcedurePreference)) {
		validationErrors.push(
			`lpaProcedurePreference: expected '${sourceLpaProcedurePreference ?? 'null'}' got '${sink.lpaProcedurePreference ?? 'null'}'`
		);
	}
	if (!compareMappedString(source.importantInformation, sink.importantInformation)) {
		validationErrors.push(
			`importantInformation: expected '${source.importantInformation ?? 'null'}' got '${sink.importantInformation ?? 'null'}'`
		);
	}
	if ((sink.isCorrectAppealType ?? null) !== (source.isCorrectAppealType ?? null)) {
		validationErrors.push(
			`isCorrectAppealType: expected '${source.isCorrectAppealType ?? 'null'}' got '${sink.isCorrectAppealType ?? 'null'}'`
		);
	}
	if ((sink.inConservationArea ?? null) !== (source.inConservationArea ?? null)) {
		validationErrors.push(
			`inConservationArea: expected '${source.inConservationArea ?? 'null'}' got '${sink.inConservationArea ?? 'null'}'`
		);
	}
	if (!compareMappedDate(source.targetDate, sink.targetDate)) {
		validationErrors.push(
			`targetDate: expected '${source.targetDate ?? 'null'}' got '${sink.targetDate?.toISOString() ?? 'null'}'`
		);
	}
	const notificationMethodsResult = validateLpaNotificationMethods(source, sink.lpaNotificationMethods);
	if (!notificationMethodsResult.isValid) {
		validationErrors.push(...notificationMethodsResult.errors);
	}
	const listedBuildingResult = validateListedBuildingDetails(source, sink.listedBuildingDetails);
	if (!listedBuildingResult.isValid) {
		validationErrors.push(...listedBuildingResult.errors);
	}
	const designatedSiteResult = validateDesignatedSiteNames(source, sink.designatedSiteNames);
	if (!designatedSiteResult.isValid) {
		validationErrors.push(...designatedSiteResult.errors);
	}

	return { isValid: validationErrors.length === 0, errors: validationErrors };
}

function validateLpaNotificationMethods(
	source: AppealHas | AppealS78,
	sinkMethods: SinkCase['lpaQuestionnaire'] extends null | undefined
		? never
		: NonNullable<SinkCase['lpaQuestionnaire']>['lpaNotificationMethods']
): ValidationResult {
	const expected = parseJsonArray<string>(source.notificationMethod, 'notificationMethod');
	return validateArrayMatch(
		expected,
		sinkMethods,
		(key) => key,
		(m) => m.lpaNotificationMethod.key,
		'lpaNotificationMethods'
	);
}

function validateListedBuildingDetails(
	source: AppealHas | AppealS78,
	sinkDetails: SinkCase['lpaQuestionnaire'] extends null | undefined
		? never
		: NonNullable<SinkCase['lpaQuestionnaire']>['listedBuildingDetails']
): ValidationResult {
	const affected = parseJsonArray<string>(source.affectedListedBuildingNumbers, 'affectedListedBuildingNumbers');
	const changed = parseJsonArray<string>(
		(source as AppealS78).changedListedBuildingNumbers,
		'changedListedBuildingNumbers'
	);
	return validateArrayMatch(
		[...affected, ...changed],
		sinkDetails,
		(entry) => entry,
		(d) => d.listEntry,
		'listedBuildingDetails'
	);
}

function validateDesignatedSiteNames(
	source: AppealHas | AppealS78,
	sinkNames: SinkCase['lpaQuestionnaire'] extends null | undefined
		? never
		: NonNullable<SinkCase['lpaQuestionnaire']>['designatedSiteNames']
): ValidationResult {
	const expected = parseJsonArray<string>(
		source.designatedSitesNames as string | null | undefined,
		'designatedSitesNames'
	);
	return validateArrayMatch(
		expected,
		sinkNames,
		(key) => key,
		(n) => n.designatedSite.key,
		'designatedSiteNames'
	);
}

function validateRepresentations(
	source: AppealHas | AppealS78,
	sinkReps: SinkCase['representations']
): ValidationResult {
	const validationErrors: string[] = [];
	const s78 = source as AppealS78;
	const expected: string[] = [];

	const representationMappings: Array<{ type: string; dateField: string | null | undefined }> = [
		{ type: APPEAL_REPRESENTATION_TYPE.APPELLANT_FINAL_COMMENT, dateField: s78.appellantCommentsSubmittedDate },
		{ type: APPEAL_REPRESENTATION_TYPE.APPELLANT_STATEMENT, dateField: s78.appellantStatementSubmittedDate },
		{ type: APPEAL_REPRESENTATION_TYPE.APPELLANT_PROOFS_EVIDENCE, dateField: s78.appellantProofsSubmittedDate },
		{ type: APPEAL_REPRESENTATION_TYPE.LPA_FINAL_COMMENT, dateField: s78.lpaCommentsSubmittedDate },
		{ type: APPEAL_REPRESENTATION_TYPE.LPA_PROOFS_EVIDENCE, dateField: s78.lpaProofsSubmittedDate },
		{ type: APPEAL_REPRESENTATION_TYPE.LPA_STATEMENT, dateField: s78.lpaStatementSubmittedDate }
	];

	representationMappings.forEach(({ type, dateField }) => {
		if (parseDateOrUndefined(dateField)) {
			expected.push(type);
		}
	});

	const nonCommentReps = sinkReps.filter((r) => r.representationType !== APPEAL_REPRESENTATION_TYPE.COMMENT);

	if (expected.length !== nonCommentReps.length) {
		validationErrors.push(
			`Expected ${expected.length} representations but found ${nonCommentReps.length}. Expected types: ${[...expected].sort().join(', ')}`
		);
	}

	const sortedExpected = [...expected].sort();
	const sortedSinkTypes = nonCommentReps.map((r) => r.representationType).sort();

	const missingTypes = sortedExpected.filter((type) => !sortedSinkTypes.includes(type));
	missingTypes.forEach((type) => {
		validationErrors.push(`Representation type '${type}' not found in sink`);
	});

	const unexpectedTypes = sortedSinkTypes.filter((type) => !sortedExpected.includes(type));
	unexpectedTypes.forEach((type) => {
		validationErrors.push(`Unexpected representation type '${type}' found in sink`);
	});

	return { isValid: validationErrors.length === 0, errors: validationErrors };
}

function validateAppealGrounds(
	source: AppealHas | AppealS78,
	sinkGrounds: SinkCase['appealGrounds']
): ValidationResult {
	const validationErrors: string[] = [];
	if (!('enforcementAppealGroundsDetails' in source)) {
		if (sinkGrounds.length !== 0) {
			validationErrors.push(`appealGrounds: expected 0 items but found ${sinkGrounds.length}`);
		}
		return { isValid: validationErrors.length === 0, errors: validationErrors };
	}
	type GroundDetail = { appealGroundLetter?: string | null };
	const grounds = parseJsonArray<GroundDetail>(
		source.enforcementAppealGroundsDetails,
		'enforcementAppealGroundsDetails'
	);
	const expected = grounds
		.filter((g) => g.appealGroundLetter)
		.map((g) => g.appealGroundLetter as string)
		.sort();
	if (expected.length !== sinkGrounds.length) {
		validationErrors.push(`appealGrounds: expected ${expected.length} items but found ${sinkGrounds.length}`);
		return { isValid: false, errors: validationErrors };
	}
	const sinkRefs = sinkGrounds.map((g) => g.ground?.groundRef ?? '').sort();
	const mismatched = expected.filter((ref, i) => ref !== sinkRefs[i]);
	if (mismatched.length > 0) {
		validationErrors.push(`appealGrounds: expected keys [${expected.join(', ')}] got [${sinkRefs.join(', ')}]`);
	}
	return { isValid: validationErrors.length === 0, errors: validationErrors };
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
	return compareAddressFields(
		mappedAddress.addressLine1,
		mappedAddress.addressLine2,
		mappedAddress.addressTown,
		mappedAddress.addressCounty,
		mappedAddress.postcode,
		sinkAddress
	);
}

function validateEvents(events: AppealEvent[], sink: SinkCase): ValidationResult {
	const validationErrors: string[] = [];
	let hasSourceHearing = false;
	let hasSourceInquiry = false;
	let hasSourceSiteVisit = false;

	for (const event of events) {
		const mapped = mapEventToSink(event);
		if (mapped.hearing) {
			hasSourceHearing = true;
			if (!sink.hearing) {
				validationErrors.push('hearing event exists in source but hearing is missing in sink');
			} else {
				const hearing = mapped.hearing.create;
				if (!compareMappedDate(hearing.hearingStartTime, sink.hearing.hearingStartTime)) {
					validationErrors.push(
						`hearing.hearingStartTime: expected '${hearing.hearingStartTime ?? 'null'}' got '${sink.hearing.hearingStartTime?.toISOString() ?? 'null'}'`
					);
				}
				if (!compareMappedDate(hearing.hearingEndTime, sink.hearing.hearingEndTime)) {
					validationErrors.push(
						`hearing.hearingEndTime: expected '${hearing.hearingEndTime ?? 'null'}' got '${sink.hearing.hearingEndTime?.toISOString() ?? 'null'}'`
					);
				}
				if (!validateEventAddress(hearing.address?.create, sink.hearing.address)) {
					validationErrors.push('hearing.address validation failed');
				}
			}
		} else if (mapped.inquiry) {
			hasSourceInquiry = true;
			if (!sink.inquiry) {
				validationErrors.push('inquiry event exists in source but inquiry is missing in sink');
			} else {
				const inquiry = mapped.inquiry.create;
				if (!compareMappedDate(inquiry.inquiryStartTime, sink.inquiry.inquiryStartTime)) {
					validationErrors.push(
						`inquiry.inquiryStartTime: expected '${inquiry.inquiryStartTime ?? 'null'}' got '${sink.inquiry.inquiryStartTime?.toISOString() ?? 'null'}'`
					);
				}
				if (!compareMappedDate(inquiry.inquiryEndTime, sink.inquiry.inquiryEndTime)) {
					validationErrors.push(
						`inquiry.inquiryEndTime: expected '${inquiry.inquiryEndTime ?? 'null'}' got '${sink.inquiry.inquiryEndTime?.toISOString() ?? 'null'}'`
					);
				}
				if (!validateEventAddress(inquiry.address?.create, sink.inquiry.address)) {
					validationErrors.push('inquiry.address validation failed');
				}
			}
		} else if (mapped.siteVisit) {
			hasSourceSiteVisit = true;
			if (!sink.siteVisit || !sink.siteVisit.visitDate || !mapped.siteVisit.create.visitDate) {
				validationErrors.push('siteVisit event exists in source but siteVisit is missing or has no visitDate in sink');
			} else if (!compareMappedDate(mapped.siteVisit.create.visitDate, sink.siteVisit.visitDate)) {
				validationErrors.push(
					`siteVisit.visitDate: expected '${mapped.siteVisit.create.visitDate ?? 'null'}' got '${sink.siteVisit.visitDate?.toISOString() ?? 'null'}'`
				);
			}
		}
	}

	if (sink.hearing && !hasSourceHearing) {
		validationErrors.push('hearing exists in sink but no hearing event found in source');
	}
	if (sink.inquiry && !hasSourceInquiry) {
		validationErrors.push('inquiry exists in sink but no inquiry event found in source');
	}
	if (sink.siteVisit && !hasSourceSiteVisit) {
		validationErrors.push('siteVisit exists in sink but no siteVisit event found in source');
	}

	return { isValid: validationErrors.length === 0, errors: validationErrors };
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

function validateServiceUserMatches<T>(
	sourceUsers: AppealServiceUser[],
	sinkItems: T[],
	getSinkUser: (item: T) => { email: string | null; firstName: string | null } | null | undefined
): boolean {
	if (sourceUsers.length !== sinkItems.length) return false;

	const sourceKeys = sourceUsers
		.map((source) => {
			const mapped = mapServiceUser(source);
			return `${mapped.email ?? ''}|${mapped.firstName ?? ''}`;
		})
		.sort();

	const sinkKeys = sinkItems
		.map((item) => {
			const sinkUser = getSinkUser(item);
			return `${sinkUser?.email ?? ''}|${sinkUser?.firstName ?? ''}`;
		})
		.sort();

	return sourceKeys.every((key, i) => key === sinkKeys[i]);
}

function validateServiceUsers(serviceUsers: AppealServiceUser[], sink: SinkCase): ValidationResult {
	const validationErrors: string[] = [];
	const appellant = serviceUsers.find((user) => getServiceUserRole(user).isAppellant);
	const agent = serviceUsers.find((user) => getServiceUserRole(user).isAgent);
	const interestedParties = serviceUsers.filter((user) => getServiceUserRole(user).isInterestedParty);
	const rule6Parties = serviceUsers.filter((user) => getServiceUserRole(user).isRule6Party);

	if (appellant && !validateServiceUser(sink.appellant, appellant)) {
		validationErrors.push('appellant service user validation failed');
	}
	if (!appellant && sink.appellant) {
		validationErrors.push('appellant exists in sink but not found in source service users');
	}
	if (agent && !validateServiceUser(sink.agent, agent)) {
		validationErrors.push('agent service user validation failed');
	}
	if (!agent && sink.agent) {
		validationErrors.push('agent exists in sink but not found in source service users');
	}

	const sinkInterestedPartyReps = sink.representations.filter(
		(r) => r.representationType === APPEAL_REPRESENTATION_TYPE.COMMENT && r.represented
	);
	if (!validateServiceUserMatches(interestedParties, sinkInterestedPartyReps, (r) => r.represented)) {
		validationErrors.push(
			`interestedParties: expected ${interestedParties.length} but found ${sinkInterestedPartyReps.length} in sink, or users do not match`
		);
	}

	if (!validateServiceUserMatches(rule6Parties, sink.appealRule6Parties, (r) => r.serviceUser)) {
		validationErrors.push(
			`rule6Parties: expected ${rule6Parties.length} but found ${sink.appealRule6Parties.length} in sink, or users do not match`
		);
	}

	return { isValid: validationErrors.length === 0, errors: validationErrors };
}

function validateParentAppeals(
	source: AppealHas | AppealS78,
	sinkParentAppeals: SinkCase['parentAppeals']
): ValidationResult {
	const validationErrors: string[] = [];

	if (source.linkedCaseStatus !== 'child') {
		if (sinkParentAppeals.length !== 0) {
			validationErrors.push(
				`Expected no parent appeals (linkedCaseStatus is '${source.linkedCaseStatus ?? 'null'}') but found ${sinkParentAppeals.length}`
			);
		}
		return { isValid: validationErrors.length === 0, errors: validationErrors };
	}

	if (!source.leadCaseReference) {
		validationErrors.push('linkedCaseStatus is child but leadCaseReference is missing');
		return { isValid: false, errors: validationErrors };
	}

	if (sinkParentAppeals.length !== 1) {
		validationErrors.push(`Expected 1 parent appeal but found ${sinkParentAppeals.length}`);
		return { isValid: false, errors: validationErrors };
	}

	const parent = sinkParentAppeals[0];
	if (parent.parentRef !== source.leadCaseReference) {
		validationErrors.push(`parentRef: expected '${source.leadCaseReference}' got '${parent.parentRef ?? 'null'}'`);
	}
	if (parent.childRef !== source.caseReference) {
		validationErrors.push(`childRef: expected '${source.caseReference}' got '${parent.childRef ?? 'null'}'`);
	}

	return { isValid: validationErrors.length === 0, errors: validationErrors };
}

type FieldValidator<T = any, U = any> = {
	fieldName: string;
	sourceValue: T;
	sinkValue: U;
	compare: (source: T, sink: U) => boolean;
};

function validateField<T, U>(validator: FieldValidator<T, U>, sourceModel: string, errors: ValidationError[]): void {
	if (!validator.compare(validator.sourceValue, validator.sinkValue)) {
		const expected = String(validator.sourceValue ?? 'null');
		const actual = String(validator.sinkValue ?? 'null');
		errors.push(createValidationError(sourceModel, validator.fieldName, `Expected '${expected}' got '${actual}'`));
	}
}

export function validateData(
	sourceCase: SourceCase,
	sinkCase: SinkCase,
	events: AppealEvent[] = [],
	serviceUsers: AppealServiceUser[] = [],
	mapLpaCodesToTest = false
): DataValidationResult {
	const source = sourceCase.data;
	const errors: ValidationError[] = [];
	const sourceModel = sourceCase.type === 'has' ? 'AppealHas' : 'AppealS78';

	const stringFieldValidators: FieldValidator<string | null | undefined, string | null | undefined>[] = [
		{
			fieldName: 'caseReference',
			sourceValue: source.caseReference,
			sinkValue: sinkCase.reference,
			compare: (s, k) => s === k
		},
		{
			fieldName: 'submissionId',
			sourceValue: source.submissionId,
			sinkValue: sinkCase.submissionId,
			compare: compareMappedString
		},
		{
			fieldName: 'caseType',
			sourceValue: source.caseType,
			sinkValue: sinkCase.appealType?.key,
			compare: compareMappedString
		},
		{
			fieldName: 'caseProcedure',
			sourceValue: mapCaseProcedure(source.caseProcedure),
			sinkValue: sinkCase.procedureType?.key,
			compare: compareMappedString
		},
		{
			fieldName: 'lpaCode',
			sourceValue: mapLpaInTest(source, mapLpaCodesToTest),
			sinkValue: sinkCase.lpa?.lpaCode,
			compare: compareMappedString
		},
		{
			fieldName: 'caseOfficerId',
			sourceValue: source.caseOfficerId,
			sinkValue: sinkCase.caseOfficer?.azureAdUserId,
			compare: compareMappedString
		},
		{
			fieldName: 'inspectorId',
			sourceValue: source.inspectorId,
			sinkValue: sinkCase.inspector?.azureAdUserId,
			compare: compareMappedString
		},
		{
			fieldName: 'padsSapId',
			sourceValue: source.padsSapId,
			sinkValue: sinkCase.padsInspector?.sapId,
			compare: compareMappedString
		},
		{
			fieldName: 'applicationReference',
			sourceValue: source.applicationReference,
			sinkValue: sinkCase.applicationReference,
			compare: compareMappedString
		}
	];

	stringFieldValidators.forEach((validator) => validateField(validator, sourceModel, errors));

	const dateFieldValidators: FieldValidator<string | Date | null | undefined, Date | null | undefined>[] = [
		{
			fieldName: 'caseCreatedDate',
			sourceValue: source.caseCreatedDate,
			sinkValue: sinkCase.caseCreatedDate,
			compare: compareMappedDate
		},
		{
			fieldName: 'caseUpdatedDate',
			sourceValue: source.caseUpdatedDate,
			sinkValue: sinkCase.caseUpdatedDate,
			compare: (sourceValue, sinkValue) => compareMappedDate(sourceValue, sinkValue, true)
		},
		{
			fieldName: 'caseValidDate',
			sourceValue: source.caseValidDate,
			sinkValue: sinkCase.caseValidDate,
			compare: compareMappedDate
		},
		{
			fieldName: 'caseExtensionDate',
			sourceValue: source.caseExtensionDate,
			sinkValue: sinkCase.caseExtensionDate,
			compare: compareMappedDate
		},
		{
			fieldName: 'caseStartedDate',
			sourceValue: source.caseStartedDate,
			sinkValue: sinkCase.caseStartedDate,
			compare: compareMappedDate
		},
		{
			fieldName: 'casePublishedDate',
			sourceValue: source.casePublishedDate,
			sinkValue: sinkCase.casePublishedDate,
			compare: compareMappedDate
		}
	];

	dateFieldValidators.forEach((validator) => validateField(validator, sourceModel, errors));

	const detailedValidations: Array<{ fn: () => ValidationResult; fieldName: string }> = [
		{ fn: () => validateSpecialisms(source, sinkCase.specialisms), fieldName: 'specialisms' },
		{ fn: () => validateChildAppeals(source, sinkCase.childAppeals), fieldName: 'childAppeals' },
		{ fn: () => validateNeighbouringSites(source, sinkCase.neighbouringSites), fieldName: 'neighbouringSites' },
		{ fn: () => validateAppealGrounds(source, sinkCase.appealGrounds), fieldName: 'appealGrounds' },
		{ fn: () => validateParentAppeals(source, sinkCase.parentAppeals), fieldName: 'parentAppeals' },
		{ fn: () => validateAppealTimetable(source, sinkCase.appealTimetable), fieldName: 'appealTimetable' },
		{ fn: () => validateAllocation(source, sinkCase.allocation), fieldName: 'allocation' },
		{ fn: () => validateAddress(source, sinkCase.address), fieldName: 'address' },
		{ fn: () => validateInspectorDecision(source, sinkCase.inspectorDecision), fieldName: 'inspectorDecision' },
		{ fn: () => validateLpaQuestionnaire(source, sinkCase.lpaQuestionnaire), fieldName: 'lpaQuestionnaire' },
		{ fn: () => validateRepresentations(source, sinkCase.representations), fieldName: 'representations' },
		{ fn: () => validateEvents(events, sinkCase), fieldName: 'events' },
		{ fn: () => validateServiceUsers(serviceUsers, sinkCase), fieldName: 'serviceUsers' },
		{ fn: () => validateAppealStatus(source, sinkCase.appealStatus), fieldName: 'appealStatus' },
		{ fn: () => validateAppellantCase(source, sinkCase.appellantCase), fieldName: 'appellantCase' }
	];

	detailedValidations.forEach((validation) => {
		const result = validation.fn();
		if (!result.isValid) {
			result.errors.forEach((error) => {
				errors.push(createValidationError(sourceModel, validation.fieldName, error));
			});
		}
	});

	const isValid = errors.length === 0;
	return {
		isValid,
		errors
	};
}
