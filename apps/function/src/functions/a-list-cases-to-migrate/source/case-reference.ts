import type { Prisma, PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export interface ReferenceId {
	caseReference: string;
	caseId?: number;
}

function isReferenceId(row: { caseReference: string | null; caseId?: number | null }): row is ReferenceId {
	return row.caseReference !== undefined && row.caseReference !== null && row.caseReference !== '';
}

export async function fetchCaseReferences(
	sourceDatabase: SourcePrismaClient,
	hasWhere: Prisma.AppealHasWhereInput,
	s78Where: Prisma.AppealS78WhereInput,
	limit?: number | null
): Promise<ReferenceId[]> {
	const commonParameters: Prisma.AppealHasFindManyArgs & Prisma.AppealS78FindManyArgs = {
		select: { caseReference: true, caseId: true }
	};
	const take = limit != null && limit > 0 ? limit : undefined;
	if (take) {
		commonParameters.take = take;
	}
	const hasRows = await sourceDatabase.appealHas.findMany({
		where: hasWhere,
		...commonParameters
	});

	const s78Rows = await sourceDatabase.appealS78.findMany({
		where: s78Where,
		...commonParameters
	});
	const byRef = new Map<string, ReferenceId>();
	for (const has of hasRows) {
		if (!isReferenceId(has)) {
			continue;
		}
		byRef.set(has.caseReference, has);
	}
	for (const s78 of s78Rows) {
		if (!isReferenceId(s78)) {
			continue;
		}
		byRef.set(s78.caseReference, s78);
	}

	return [...byRef.values()];
}
