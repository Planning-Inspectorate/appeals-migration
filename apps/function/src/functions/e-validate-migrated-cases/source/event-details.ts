import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export async function fetchSourceEvents(sourceDatabase: SourcePrismaClient, caseReference: string) {
	return sourceDatabase.appealEvent.findMany({
		where: { caseReference },
		orderBy: { eventStartDateTime: 'asc' }
	});
}
