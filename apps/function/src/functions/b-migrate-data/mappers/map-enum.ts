import {
	APPEAL_CASE_DECISION_OUTCOME,
	APPEAL_CASE_PROCEDURE,
	APPEAL_CASE_STATUS,
	APPEAL_CASE_VALIDATION_OUTCOME,
	APPEAL_DEVELOPMENT_TYPE,
	APPEAL_LINKED_CASE_STATUS,
	APPEAL_TYPE_OF_PLANNING_APPLICATION
} from '@planning-inspectorate/data-model';

function mapSourceToSinkValues(value: string | null, map: Map<string, string | null>): string | null {
	if (!value) {
		return null;
	}
	return map.get(value) || value;
}

export function mapCaseDecisionOutcome(caseDecisionOutcome: string | null): string | null {
	// TODO: confirm mappings
	const map: Map<string, string> = new Map([
		['Allowed', APPEAL_CASE_DECISION_OUTCOME.ALLOWED],
		['Allowed in part', APPEAL_CASE_DECISION_OUTCOME.ALLOWED],
		['Allowed with conditions', APPEAL_CASE_DECISION_OUTCOME.ALLOWED],
		['Appeal Withdrawn', APPEAL_CASE_DECISION_OUTCOME.INVALID],
		['Dismissed', APPEAL_CASE_DECISION_OUTCOME.DISMISSED],
		['Invalid', APPEAL_CASE_DECISION_OUTCOME.INVALID],
		['Notice Quashed', APPEAL_CASE_DECISION_OUTCOME.DISMISSED],
		['Notice Upheld', APPEAL_CASE_DECISION_OUTCOME.NOTICE_UPHELD],
		['Notice upheld', APPEAL_CASE_DECISION_OUTCOME.NOTICE_UPHELD],
		['Notice varied and upheld', APPEAL_CASE_DECISION_OUTCOME.NOTICE_VARIED_AND_UPHELD],
		['Planning permission granted', APPEAL_CASE_DECISION_OUTCOME.PLANNING_PERMISSION_GRANTED],
		['Quashed On Legal Grounds', APPEAL_CASE_DECISION_OUTCOME.QUASHED_ON_LEGAL_GROUNDS],
		['Quashed on legal grounds', APPEAL_CASE_DECISION_OUTCOME.QUASHED_ON_LEGAL_GROUNDS],
		['Split Decision', APPEAL_CASE_DECISION_OUTCOME.SPLIT_DECISION],
		['Split decision', APPEAL_CASE_DECISION_OUTCOME.SPLIT_DECISION]
	]);
	return mapSourceToSinkValues(caseDecisionOutcome, map);
}

export function mapCaseStatus(caseStatus: string | null): string | null {
	// TODO: confirm mappings
	const map: Map<string, string> = new Map([
		['Abeyance', APPEAL_CASE_STATUS.AWAITING_TRANSFER],
		['Appeal Lapsed', APPEAL_CASE_STATUS.INVALID],
		['Appeal Withdrawn', APPEAL_CASE_STATUS.WITHDRAWN],
		['Appeal withdrawn', APPEAL_CASE_STATUS.WITHDRAWN],
		['Application Withdrawn', APPEAL_CASE_STATUS.WITHDRAWN],
		['Case In Progress', APPEAL_CASE_STATUS.LPA_QUESTIONNAIRE],
		['Closed - Opened in Error', APPEAL_CASE_STATUS.CLOSED],
		['Decision Issued', APPEAL_CASE_STATUS.COMPLETE],
		['Event', APPEAL_CASE_STATUS.EVENT],
		['File Sent to Chart for Inspector', APPEAL_CASE_STATUS.AWAITING_EVENT],
		['Historic', APPEAL_CASE_STATUS.COMPLETE],
		['Incomplete', APPEAL_CASE_STATUS.INVALID],
		['Invalid - Missing Information', APPEAL_CASE_STATUS.INVALID],
		['Invalid - No Right of Appeal', APPEAL_CASE_STATUS.INVALID],
		['Invalid - Out of Time', APPEAL_CASE_STATUS.INVALID],
		['New Case', APPEAL_CASE_STATUS.ASSIGN_CASE_OFFICER],
		['Notice Withdrawn', APPEAL_CASE_STATUS.WITHDRAWN],
		['Notice withdrawn', APPEAL_CASE_STATUS.WITHDRAWN],
		['Postponed', APPEAL_CASE_STATUS.AWAITING_TRANSFER],
		['Ready for Inspector Action/Awaiting Event', APPEAL_CASE_STATUS.AWAITING_EVENT],
		['Report Sent to Decision Branch', APPEAL_CASE_STATUS.AWAITING_TRANSFER],
		['Turned Away', APPEAL_CASE_STATUS.INVALID],
		['Validated', APPEAL_CASE_STATUS.READY_TO_START],
		['Validation Review', APPEAL_CASE_STATUS.VALIDATION]
	]);
	return mapSourceToSinkValues(caseStatus, map);
}

export function mapCaseProcedure(caseProcedure: string | null): string | null {
	const map: Map<string, string> = new Map([
		['WR', APPEAL_CASE_PROCEDURE.WRITTEN],
		['LI', APPEAL_CASE_PROCEDURE.INQUIRY],
		['IH', APPEAL_CASE_PROCEDURE.HEARING]
	]);
	return mapSourceToSinkValues(caseProcedure, map);
}

export function mapCaseValidationOutcome(caseValidationOutcome: string | null): string | null {
	const map: Map<string, string> = new Map([
		['Incomplete', APPEAL_CASE_VALIDATION_OUTCOME.INCOMPLETE],
		['Invalid', APPEAL_CASE_VALIDATION_OUTCOME.INVALID],
		['Invalid - Missing Information', APPEAL_CASE_VALIDATION_OUTCOME.INVALID],
		['Invalid - No Right of Appeal', APPEAL_CASE_VALIDATION_OUTCOME.INVALID],
		['Invalid - Out of Time', APPEAL_CASE_VALIDATION_OUTCOME.INVALID],
		['Valid', APPEAL_CASE_VALIDATION_OUTCOME.VALID]
	]);
	return mapSourceToSinkValues(caseValidationOutcome, map);
}

export function mapDevelopmentType(developmentType: string | null): string | null {
	const map: Map<string, string> = new Map([
		['Change Of Use', APPEAL_DEVELOPMENT_TYPE.CHANGE_OF_USE],
		['Change of Use', APPEAL_DEVELOPMENT_TYPE.CHANGE_OF_USE],
		['Change of use', APPEAL_DEVELOPMENT_TYPE.CHANGE_OF_USE],
		['Householder Development', APPEAL_DEVELOPMENT_TYPE.HOUSEHOLDER],
		['Householder Developments', APPEAL_DEVELOPMENT_TYPE.HOUSEHOLDER],
		['Householder development', APPEAL_DEVELOPMENT_TYPE.HOUSEHOLDER],
		['Householder developments', APPEAL_DEVELOPMENT_TYPE.HOUSEHOLDER],
		['Major Development', APPEAL_DEVELOPMENT_TYPE.OTHER_MAJOR],
		['Major Developments', APPEAL_DEVELOPMENT_TYPE.OTHER_MAJOR],
		['Major Dwelling', APPEAL_DEVELOPMENT_TYPE.MAJOR_DWELLINGS],
		['Major Dwellings', APPEAL_DEVELOPMENT_TYPE.MAJOR_DWELLINGS],
		['Major dwellings', APPEAL_DEVELOPMENT_TYPE.MAJOR_DWELLINGS],
		['Major Offices', APPEAL_DEVELOPMENT_TYPE.MAJOR_OFFICES],
		['Major offices', APPEAL_DEVELOPMENT_TYPE.MAJOR_OFFICES],
		['Major offices/R&D/light industry', APPEAL_DEVELOPMENT_TYPE.MAJOR_OFFICES],
		['Major general industry/storage/warehousing', APPEAL_DEVELOPMENT_TYPE.MAJOR_INDUSTRY_STORAGE],
		['Major manufacturing, storage and warehousing', APPEAL_DEVELOPMENT_TYPE.MAJOR_INDUSTRY_STORAGE],
		['Major retail and services', APPEAL_DEVELOPMENT_TYPE.MAJOR_RETAIL_SERVICES],
		['Major retail distribution and servicing', APPEAL_DEVELOPMENT_TYPE.MAJOR_RETAIL_SERVICES],
		['Major traveller and caravan pitches', APPEAL_DEVELOPMENT_TYPE.MAJOR_TRAVELLER_CARAVAN],
		['Mineral Working', APPEAL_DEVELOPMENT_TYPE.MINERAL_WORKINGS],
		['Mineral working', APPEAL_DEVELOPMENT_TYPE.MINERAL_WORKINGS],
		['Minor Development', APPEAL_DEVELOPMENT_TYPE.OTHER_MINOR],
		['Minor Dwellings', APPEAL_DEVELOPMENT_TYPE.MINOR_DWELLINGS],
		['Minor Manufacturing, Storage and Warehousing', APPEAL_DEVELOPMENT_TYPE.MINOR_INDUSTRY_STORAGE],
		['Minor Offices', APPEAL_DEVELOPMENT_TYPE.MINOR_OFFICES],
		['Minor Retail Distribution and Servicing', APPEAL_DEVELOPMENT_TYPE.MINOR_RETAIL_SERVICES],
		['Minor dwelling', APPEAL_DEVELOPMENT_TYPE.MINOR_DWELLINGS],
		['Minor dwellings', APPEAL_DEVELOPMENT_TYPE.MINOR_DWELLINGS],
		['Minor general industry/storage/warehousing', APPEAL_DEVELOPMENT_TYPE.MINOR_INDUSTRY_STORAGE],
		['Minor manufacturing, storage and warehousing', APPEAL_DEVELOPMENT_TYPE.MINOR_INDUSTRY_STORAGE],
		['Minor offices/R&D/light industry', APPEAL_DEVELOPMENT_TYPE.MINOR_OFFICES],
		['Minor retail and services', APPEAL_DEVELOPMENT_TYPE.MINOR_RETAIL_SERVICES],
		['Minor retail distribution and servicing', APPEAL_DEVELOPMENT_TYPE.MINOR_RETAIL_SERVICES],
		['Minor traveller and caravan pitches', APPEAL_DEVELOPMENT_TYPE.MINOR_TRAVELLER_CARAVAN],
		['Other Major Development', APPEAL_DEVELOPMENT_TYPE.OTHER_MAJOR],
		['Other Major Developments', APPEAL_DEVELOPMENT_TYPE.OTHER_MAJOR],
		['Other Minor Developments', APPEAL_DEVELOPMENT_TYPE.OTHER_MINOR],
		['Other major development', APPEAL_DEVELOPMENT_TYPE.OTHER_MAJOR],
		['Other major developments', APPEAL_DEVELOPMENT_TYPE.OTHER_MAJOR],
		['Other minor development', APPEAL_DEVELOPMENT_TYPE.OTHER_MINOR],
		['Other minor developments', APPEAL_DEVELOPMENT_TYPE.OTHER_MINOR]
	]);
	return mapSourceToSinkValues(developmentType, map);
}

export function mapLinkedCaseStatus(linkedCaseStatus: string | null): string | null {
	const map: Map<string, string | null> = new Map([
		['Child', APPEAL_LINKED_CASE_STATUS.CHILD],
		['Lead', APPEAL_LINKED_CASE_STATUS.LEAD],
		['Not Linked', null]
	]);
	return mapSourceToSinkValues(linkedCaseStatus, map);
}

export function mapTypeOfPlanningApplication(typeOfPlanningApplication: string | null): string | null {
	const map: Map<string, string | null> = new Map([
		['Application for approval of reserved matters', APPEAL_TYPE_OF_PLANNING_APPLICATION.RESERVED_MATTERS],
		['Application for full planning permission', APPEAL_TYPE_OF_PLANNING_APPLICATION.FULL_APPEAL],
		['Application for outline planning permission', APPEAL_TYPE_OF_PLANNING_APPLICATION.OUTLINE_PLANNING],
		[
			'Application for variation or removal of a condition on a permission',
			APPEAL_TYPE_OF_PLANNING_APPLICATION.REMOVAL_OR_VARIATION_OF_CONDITIONS
		]
	]);
	return mapSourceToSinkValues(typeOfPlanningApplication, map);
}
