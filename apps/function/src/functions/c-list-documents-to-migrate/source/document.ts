import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export interface DocumentInfo {
	documentId: string;
	caseReference: string;
}

export async function fetchDocumentsByCaseReference(
	sourceDatabase: SourcePrismaClient,
	caseReference: string
): Promise<DocumentInfo[]> {
	const documents = await sourceDatabase.appealDocument.findMany({
		where: {
			caseReference: caseReference
		},
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
