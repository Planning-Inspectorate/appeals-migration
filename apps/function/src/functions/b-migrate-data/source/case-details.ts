import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export async function fetchCaseDetails(
	sourceDatabase: SourcePrismaClient,
	caseReference: string,
	mapLpaCodesToTest: boolean = false
) {
	const hasCase = await sourceDatabase.appealHas.findFirst({
		where: { caseReference }
	});

	if (hasCase) {
		if (mapLpaCodesToTest && hasCase.lpaCode) {
			// override all LPA codes in TEST, to ensure they exist in the sync system
			hasCase.lpaCode = 'Q9999';
		}
		return { type: 'has' as const, data: hasCase };
	}

	const s78Case = await sourceDatabase.appealS78.findFirst({
		where: { caseReference }
	});

	if (s78Case) {
		if (mapLpaCodesToTest && s78Case.lpaCode) {
			// override all LPA codes in TEST, to ensure they exist in the sync system
			s78Case.lpaCode = 'Q9999';
		}
		return { type: 's78' as const, data: s78Case };
	}

	return null;
}
