import type { Prisma } from '@pins/odw-curated-database/src/client/client.ts';
import type { ToMigrateParameter } from '@pins/appeals-migration-database/src/client/client.ts';

export function mapToMigrateParameterToWhere(
	param: ToMigrateParameter
): Prisma.AppealHasWhereInput & Prisma.AppealS78WhereInput {
	const where: Prisma.AppealHasWhereInput & Prisma.AppealS78WhereInput = {};

	if (param.status != null && param.status !== '') {
		where.caseStatus = param.status;
	}

	if (param.dateReceivedFrom != null || param.dateReceivedTo != null) {
		where.caseSubmittedDate = {};
		if (param.dateReceivedFrom != null) {
			where.caseSubmittedDate.gte = param.dateReceivedFrom.toISOString();
		}
		if (param.dateReceivedTo != null) {
			where.caseSubmittedDate.lte = param.dateReceivedTo.toISOString();
		}
	}

	return where;
}
