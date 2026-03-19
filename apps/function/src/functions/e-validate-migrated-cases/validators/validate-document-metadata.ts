import type { AppealDocument } from '@pins/odw-curated-database/src/client/client.ts';
import type { fetchSinkDocuments } from '../sink/documents.ts';
import { compareMappedDate, compareMappedNumber, compareMappedString } from './validate-data.ts';

type SinkDocument = Awaited<ReturnType<typeof fetchSinkDocuments>>[number];
type SinkDocumentVersion = SinkDocument['versions'][number];

function validateField(isValid: boolean, fieldName: string, version: number): boolean {
	if (!isValid) {
		console.warn(`${fieldName} mismatch for version ${version}`);
		return false;
	}
	return true;
}

function validateDocumentVersion(sourceDoc: AppealDocument, sinkVersion: SinkDocumentVersion): boolean {
	const sourceVersion = sourceDoc.version ?? 1;

	return (
		validateField(sinkVersion.version === sourceVersion, 'Version number', sourceVersion) &&
		validateField(compareMappedString(sourceDoc.filename, sinkVersion.fileName), 'Filename', sourceVersion) &&
		validateField(compareMappedString(sourceDoc.mime, sinkVersion.mime), 'MIME type', sourceVersion) &&
		validateField(compareMappedNumber(sourceDoc.size, sinkVersion.size), 'Size', sourceVersion) &&
		validateField(compareMappedString(sourceDoc.fileMD5, sinkVersion.fileMD5), 'MD5', sourceVersion) &&
		validateField(
			compareMappedString(sourceDoc.documentId, sinkVersion.horizonDataID),
			'Horizon data ID',
			sourceVersion
		) &&
		validateField(
			compareMappedString(sourceDoc.originalFilename, sinkVersion.originalFilename),
			'Original filename',
			sourceVersion
		) &&
		validateField(compareMappedString(sourceDoc.description, sinkVersion.description), 'Description', sourceVersion) &&
		validateField(compareMappedString(sourceDoc.author, sinkVersion.author), 'Author', sourceVersion) &&
		validateField(compareMappedString(sourceDoc.owner, sinkVersion.owner), 'Owner', sourceVersion) &&
		validateField(compareMappedString(sourceDoc.origin, sinkVersion.origin), 'Origin', sourceVersion) &&
		validateField(compareMappedString(sourceDoc.caseStage, sinkVersion.stage), 'Stage', sourceVersion) &&
		validateField(compareMappedString(sourceDoc.documentURI, sinkVersion.documentURI), 'Document URI', sourceVersion) &&
		validateField(
			compareMappedDate(sourceDoc.datePublished, sinkVersion.datePublished),
			'Date published',
			sourceVersion
		) &&
		validateField(
			compareMappedDate(sourceDoc.dateReceived, sinkVersion.dateReceived),
			'Date received',
			sourceVersion
		) &&
		validateField(compareMappedDate(sourceDoc.lastModified, sinkVersion.lastModified), 'Last modified', sourceVersion)
	);
}

function validateDocument(sourceDocuments: AppealDocument[], sinkDocument: SinkDocument): boolean {
	const documentId = sourceDocuments[0]?.documentId;

	if (sinkDocument.guid !== documentId) {
		console.warn(`Document GUID mismatch: expected ${documentId}, got ${sinkDocument.guid}`);
		return false;
	}

	if (sinkDocument.versions.length !== sourceDocuments.length) {
		console.warn(
			`Version count mismatch for document ${documentId}: expected ${sourceDocuments.length}, got ${sinkDocument.versions.length}`
		);
		return false;
	}

	for (const sourceDoc of sourceDocuments) {
		const sourceVersion = sourceDoc.version ?? 1;
		const sinkVersion = sinkDocument.versions.find((v) => v.version === sourceVersion);

		if (!sinkVersion) {
			console.warn(`Version ${sourceVersion} not found in sink for document ${documentId}`);
			return false;
		}

		if (!validateDocumentVersion(sourceDoc, sinkVersion)) {
			return false;
		}
	}

	return true;
}

export function validateDocumentMetadata(sourceDocuments: AppealDocument[], sinkDocuments: SinkDocument[]): boolean {
	if (sourceDocuments.length === 0 && sinkDocuments.length === 0) {
		return true;
	}

	const sourceByDocumentId = new Map<string, AppealDocument[]>();
	for (const doc of sourceDocuments) {
		if (!doc.documentId) {
			console.warn('Source document missing documentId');
			return false;
		}
		const existing = sourceByDocumentId.get(doc.documentId) ?? [];
		existing.push(doc);
		sourceByDocumentId.set(doc.documentId, existing);
	}

	if (sourceByDocumentId.size !== sinkDocuments.length) {
		console.warn(
			`Document count mismatch: expected ${sourceByDocumentId.size} unique documents, got ${sinkDocuments.length}`
		);
		return false;
	}

	for (const sinkDoc of sinkDocuments) {
		const sourceDocsForId = sourceByDocumentId.get(sinkDoc.guid);

		if (!sourceDocsForId) {
			console.warn(`Sink document ${sinkDoc.guid} not found in source`);
			return false;
		}

		if (!validateDocument(sourceDocsForId, sinkDoc)) {
			return false;
		}
	}

	return true;
}
