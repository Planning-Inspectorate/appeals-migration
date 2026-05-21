import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';
import { mapLpaInTest } from '../mappers/map-lpa.ts';

export async function fetchCaseDetails(
	sourceDatabase: SourcePrismaClient,
	caseReference: string,
	mapLpaCodesToTest: boolean = false
) {
	const hasCase = await sourceDatabase.appealHas.findFirst({
		where: { caseReference }
	});

	if (hasCase) {
		hasCase.lpaCode = mapLpaInTest(hasCase, mapLpaCodesToTest);
		return { type: 'has' as const, data: hasCase };
	}

	const s78Case = await sourceDatabase.appealS78.findFirst({
		where: { caseReference }
	});

	if (s78Case) {
		s78Case.lpaCode = mapLpaInTest(s78Case, mapLpaCodesToTest);
		return { type: 's78' as const, data: s78Case };
	}

	return null;
}
