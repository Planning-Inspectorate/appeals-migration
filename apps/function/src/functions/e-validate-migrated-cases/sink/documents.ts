import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';

export async function fetchSinkDocuments(sinkDatabase: SinkPrismaClient, caseReference: string) {
	const appeal = await sinkDatabase.appeal.findUnique({
		where: { reference: caseReference },
		select: { id: true }
	});

	if (!appeal) {
		return [];
	}

	return sinkDatabase.document.findMany({
		where: { caseId: appeal.id },
		include: {
			versions: true
		}
	});
}
