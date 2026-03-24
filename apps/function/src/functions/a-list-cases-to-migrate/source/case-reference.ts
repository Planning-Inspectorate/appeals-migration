import type { Prisma, PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

function isValidCaseReference(ref: string | null | undefined): ref is string {
	return ref !== null && ref !== undefined && ref !== '';
}

export async function fetchCaseReferences(
	sourceDatabase: SourcePrismaClient,
	hasWhere: Prisma.AppealHasWhereInput,
	s78Where: Prisma.AppealS78WhereInput
): Promise<string[]> {
	const hasRows = await sourceDatabase.appealHas.findMany({
		where: hasWhere,
		select: { caseReference: true }
	});

	const s78Rows = await sourceDatabase.appealS78.findMany({
		where: s78Where,
		select: { caseReference: true }
	});

	const refs = [...hasRows.map((r) => r.caseReference), ...s78Rows.map((r) => r.caseReference)].filter(
		isValidCaseReference
	);
	return Array.from(new Set(refs));
}
