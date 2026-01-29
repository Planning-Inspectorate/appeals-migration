import type { Prisma } from '@pins/odw-curated-database/src/client/client.ts';
import type { ToMigrateParameter } from '@pins/appeals-migration-database/src/client/client.ts';

export function mapToMigrateParameterToWhere(
	param: ToMigrateParameter
): Prisma.AppealHasWhereInput & Prisma.AppealS78WhereInput {
	if (param.status == null || param.status === '') return {};
	return { caseStatus: param.status };
}
