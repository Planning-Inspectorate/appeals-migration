import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';

export async function fetchSinkCaseDetails(sinkDatabase: SinkPrismaClient, caseReference: string) {
	return sinkDatabase.appeal.findUnique({
		where: { reference: caseReference }
	});
}
