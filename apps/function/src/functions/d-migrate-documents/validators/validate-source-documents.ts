import type { AppealDocument } from '@pins/odw-curated-database/src/client/client.ts';

export function validateSourceDocuments(sourceDocuments: AppealDocument[], documentId: string): void {
	if (sourceDocuments.length === 0) {
		throw new Error(`No documents found for documentId: ${documentId}`);
	}

	const firstDocument = sourceDocuments[0];

	if (!firstDocument.caseReference) {
		throw new Error(`Document ${documentId} is missing caseReference`);
	}

	if (!firstDocument.filename) {
		throw new Error(`Document ${documentId} is missing filename`);
	}

	if (!firstDocument.documentId) {
		throw new Error(`Document ${documentId} is missing documentId`);
	}

	// Validate all documents share the same documentId
	const allSameDocumentId = sourceDocuments.every((doc) => doc.documentId === firstDocument.documentId);
	if (!allSameDocumentId) {
		throw new Error(`All source documents must share the same documentId for document ${documentId}`);
	}

	// Validate all versions have required fields
	sourceDocuments.forEach((doc, index) => {
		if (!doc.filename) {
			throw new Error(`Document ${documentId} version at index ${index} is missing filename`);
		}
	});
}
