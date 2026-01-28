import type { Prisma } from '@pins/odw-curated-database/src/client/client.ts';
import type { ToMigrateParameter } from '@pins/appeals-migration-database/src/client/client.ts';

export function mapToMigrateParameterToAppealHasWhere(param: ToMigrateParameter): Prisma.appeal_hasWhereInput {
	if (param.status == null || param.status === '') return {};
	return { caseStatus: param.status };
}

export function mapToMigrateParameterToAppealS78Where(param: ToMigrateParameter): Prisma.appeal_s78WhereInput {
	if (param.status == null || param.status === '') return {};
	return { caseStatus: param.status };
}

/**
 * Test with null/empty status → returns {}
 * Test with valid status → returns { caseStatus: "value" }
 * Test both HAS and S78 mappers
 */
