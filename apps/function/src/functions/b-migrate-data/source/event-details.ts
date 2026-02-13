import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export async function fetchEventDetails(sourceDatabase: SourcePrismaClient, caseReference: string) {
	const events = await sourceDatabase.appealEvent.findMany({
		where: { caseReference },
		orderBy: { eventStartDateTime: 'asc' }
	});

	return events;
}
