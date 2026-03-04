import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export async function fetchSourceServiceUsers(sourceDatabase: SourcePrismaClient, caseReference: string) {
	return sourceDatabase.appealServiceUser.findMany({
		where: { caseReference }
	});
}
