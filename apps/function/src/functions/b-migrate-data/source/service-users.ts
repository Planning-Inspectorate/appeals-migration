import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export async function fetchServiceUsers(sourceDatabase: SourcePrismaClient, caseReference: string) {
	return await sourceDatabase.appealServiceUser.findMany({
		where: { caseReference }
	});
}
