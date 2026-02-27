import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export async function fetchSourceDocuments(sourceDatabase: SourcePrismaClient, caseReference: string) {
	return sourceDatabase.appealDocument.findMany({
		where: { caseReference }
	});
}
