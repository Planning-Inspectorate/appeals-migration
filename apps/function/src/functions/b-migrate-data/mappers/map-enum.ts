import {
	APPEAL_CASE_PROCEDURE,
	APPEAL_CASE_STATUS,
	APPEAL_CASE_VALIDATION_OUTCOME,
	APPEAL_LINKED_CASE_STATUS
} from '@planning-inspectorate/data-model';

function mapSourceToSinkValues(value: string | null, map: Map<string, string | null>): string | null {
	if (!value) {
		return null;
	}
	return map.get(value) || value;
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

export function mapLinkedCaseStatus(linkedCaseStatus: string | null): string | null {
	const map: Map<string, string | null> = new Map([
		['Child', APPEAL_LINKED_CASE_STATUS.CHILD],
		['Lead', APPEAL_LINKED_CASE_STATUS.LEAD],
		['Not Linked', null]
	]);
	return mapSourceToSinkValues(linkedCaseStatus, map);
}
