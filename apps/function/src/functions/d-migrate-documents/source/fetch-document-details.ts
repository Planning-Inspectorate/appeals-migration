import type {
	AppealDocument,
	PrismaClient as SourcePrismaClient
} from '@pins/odw-curated-database/src/client/client.ts';

export async function fetchDocumentDetails(
	sourceDatabase: SourcePrismaClient,
	documentId: string
): Promise<AppealDocument[]> {
	const documents = await sourceDatabase.appealDocument.findMany({
		where: {
			documentId
		},
		orderBy: {
			version: 'asc'
		}
	});

	if (documents.length === 0) {
		throw new Error(`No document found with documentId: ${documentId}`);
	}

	return documents;
}
