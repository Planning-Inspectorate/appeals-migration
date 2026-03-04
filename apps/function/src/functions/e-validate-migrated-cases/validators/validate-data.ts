import type { Appeal } from '@pins/manage-appeals-database/src/client/client.ts';
import type { AppealHas, AppealS78 } from '@pins/odw-curated-database/src/client/client.ts';
import { parseDateOrUndefined, stringOrUndefined } from '../../shared/helpers/index.ts';

export type SourceCase = { type: 'has'; data: AppealHas } | { type: 's78'; data: AppealS78 };

function compareMappedString(sourceValue: string | null | undefined, sinkValue: string | null | undefined): boolean {
	const mapped = stringOrUndefined(sourceValue);
	return mapped === (sinkValue ?? undefined);
}

function compareMappedDate(sourceValue: string | null | undefined, sinkValue: Date | null | undefined): boolean {
	const mapped = parseDateOrUndefined(sourceValue);
	const sinkDate = sinkValue ?? undefined;
	if (mapped === undefined && sinkDate === undefined) return true;
	if (mapped === undefined || sinkDate === undefined) return false;
	return mapped.getTime() === sinkDate.getTime();
}

export function validateData(sourceCase: SourceCase, sinkCase: Appeal): boolean {
	const source = sourceCase.data;

	if (sinkCase.reference !== source.caseReference) return false;
	if (!compareMappedString(source.submissionId, sinkCase.submissionId)) return false;
	if (!compareMappedString(source.applicationReference, sinkCase.applicationReference)) return false;
	if (!compareMappedDate(source.caseCreatedDate, sinkCase.caseCreatedDate)) return false;
	if (!compareMappedDate(source.caseUpdatedDate, sinkCase.caseUpdatedDate)) return false;
	if (!compareMappedDate(source.caseValidDate, sinkCase.caseValidDate)) return false;
	if (!compareMappedDate(source.caseExtensionDate, sinkCase.caseExtensionDate)) return false;
	if (!compareMappedDate(source.caseStartedDate, sinkCase.caseStartedDate)) return false;
	if (!compareMappedDate(source.casePublishedDate, sinkCase.casePublishedDate)) return false;

	return true;
}
