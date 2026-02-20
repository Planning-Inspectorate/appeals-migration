import type { ToMigrateParameter } from '@pins/appeals-migration-database/src/client/client.ts';
import type { Prisma } from '@pins/odw-curated-database/src/client/client.ts';
import { createDateRange } from '../../shared/helpers/index.ts';

function addIfPresent(where: Record<string, unknown>, key: string, value: string | null | undefined): void {
	if (value != null && value !== '') {
		where[key] = value;
	}
}

export function mapToMigrateParameterToWhere(
	param: ToMigrateParameter
): Prisma.AppealHasWhereInput & Prisma.AppealS78WhereInput {
	const where: Prisma.AppealHasWhereInput & Prisma.AppealS78WhereInput = {};

	addIfPresent(where, 'caseStatus', param.status);
	addIfPresent(where, 'caseProcedure', param.procedureType);
	addIfPresent(where, 'lpaCode', param.lpa);

	const dateReceivedRange = createDateRange(param.dateReceivedFrom, param.dateReceivedTo);
	if (dateReceivedRange) {
		where.caseSubmittedDate = dateReceivedRange;
	}

	const decisionDateRange = createDateRange(param.decisionDateFrom, param.decisionDateTo);
	if (decisionDateRange) {
		where.caseDecisionOutcomeDate = decisionDateRange;
	}

	return where;
}
