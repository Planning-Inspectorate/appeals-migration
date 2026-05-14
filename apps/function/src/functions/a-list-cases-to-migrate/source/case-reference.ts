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
	s78Where: Prisma.AppealS78WhereInput
): Promise<ReferenceId[]> {
	const hasRows = await sourceDatabase.appealHas.findMany({
		where: hasWhere,
		select: { caseReference: true, caseId: true }
	});

	const s78Rows = await sourceDatabase.appealS78.findMany({
		where: s78Where,
		select: { caseReference: true, caseId: true }
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
