import type {
	Prisma as SourcePrisma,
	PrismaClient as SourcePrismaClient
} from '@pins/odw-curated-database/src/client/client.ts';

export async function fetchSourceDocuments(
	sourceDatabase: SourcePrismaClient,
	caseReference: string,
	sourceCaseId?: string | null
) {
	let where: SourcePrisma.AppealDocumentWhereInput = { caseReference };
	if (sourceCaseId) {
		const sourceCaseNumber = parseInt(sourceCaseId);
		if (!isNaN(sourceCaseNumber)) {
			where = {
				OR: [{ caseReference: caseReference }, { caseId: sourceCaseNumber }]
			};
		}
	}
	return sourceDatabase.appealDocument.findMany({
		where
	});
}
