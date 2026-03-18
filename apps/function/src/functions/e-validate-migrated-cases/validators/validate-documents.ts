import type { AppealDocument } from '@pins/odw-curated-database/src/client/client.ts';
import type { SinkDocumentClient } from '../../../types.ts';
import { buildBlobStoragePath } from '../../d-migrate-documents/helpers/map-case-reference-for-storage.ts';

export async function validateDocuments(
	documents: AppealDocument[],
	sinkDocumentClient: SinkDocumentClient
): Promise<boolean> {
	if (documents.length === 0) {
		return true;
	}

	for (const doc of documents) {
		const caseReference = doc.caseReference;
		const documentId = doc.documentId;
		const version = doc.version ?? 1;
		const filename = doc.filename;

		if (!caseReference || !filename) {
			console.warn(`Document ${documentId} missing caseReference or filename`);
			return false;
		}

		const blobPath = buildBlobStoragePath(caseReference, documentId, version, filename);
		const blobClient = sinkDocumentClient.getBlockBlobClient(blobPath);
		const exists = await blobClient.exists();

		if (!exists) {
			console.warn(`Document not found in blob storage: ${blobPath}`);
			return false;
		}
	}

	return true;
}
