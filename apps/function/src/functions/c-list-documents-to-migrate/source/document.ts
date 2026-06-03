import type {
	Prisma as SourcePrisma,
	PrismaClient as SourcePrismaClient
} from '@pins/odw-curated-database/src/client/client.ts';

export interface DocumentInfo {
	documentId: string;
	caseReference: string;
}

export async function fetchDocumentsForCase(
	sourceDatabase: SourcePrismaClient,
	caseReference: string,
	sourceCaseId: string | null
): Promise<DocumentInfo[]> {
	let where: SourcePrisma.AppealDocumentWhereInput = { caseReference };
	if (sourceCaseId) {
		const sourceCaseNumber = parseInt(sourceCaseId);
		if (!isNaN(sourceCaseNumber)) {
			where = {
				OR: [{ caseReference: caseReference }, { caseId: sourceCaseNumber }]
			};
		}
	}
	const documents = await sourceDatabase.appealDocument.findMany({
		where,
		select: {
			documentId: true,
			caseReference: true
		}
	});

	return documents.filter(
		(doc): doc is DocumentInfo =>
			doc.caseReference !== null && doc.caseReference !== undefined && doc.caseReference !== ''
	);
}
