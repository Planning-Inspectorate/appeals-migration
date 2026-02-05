import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export async function fetchCaseDetails(sourceDatabase: SourcePrismaClient, caseReference: string) {
	const hasCase = await sourceDatabase.appealHas.findFirst({
		where: { caseReference }
	});

	if (hasCase) {
		return { type: 'has' as const, data: hasCase };
	}

	const s78Case = await sourceDatabase.appealS78.findFirst({
		where: { caseReference }
	});

	if (s78Case) {
		return { type: 's78' as const, data: s78Case };
	}

	return null;
}
