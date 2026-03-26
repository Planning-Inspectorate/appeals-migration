import type { AppealDocument } from '@pins/odw-curated-database/src/client/client.ts';
import type { fetchSinkDocuments } from '../sink/documents.ts';
import type { DocumentValidationResult, ValidationError } from '../types/validation-types.ts';
import { createValidationError, createValidationFailure, createValidationSuccess } from '../types/validation-types.ts';
import { compareMappedDate, compareMappedNumber, compareMappedString } from './validate-data.ts';

type SinkDocument = Awaited<ReturnType<typeof fetchSinkDocuments>>[number];
type SinkDocumentVersion = SinkDocument['versions'][number];

function validateField(
	errors: ValidationError[],
	isValid: boolean,
	fieldName: string,
	documentId: string,
	version: number,
	sourceValue: unknown,
	sinkValue: unknown
): void {
	if (!isValid) {
		const expected = String(sourceValue ?? 'null');
		const actual = String(sinkValue ?? 'null');
		errors.push(
			createValidationError(
				'Document',
				fieldName,
				`${fieldName} mismatch for document ${documentId} version ${version}: Expected '${expected}' got '${actual}'`
			)
		);
	}
}

function validateDocumentVersion(
	errors: ValidationError[],
	sourceDoc: AppealDocument,
	sinkVersion: SinkDocumentVersion,
	documentId: string,
	sourceVersion: number
): void {
	validateField(
		errors,
		sinkVersion.version === sourceVersion,
		'Version number',
		documentId,
		sourceVersion,
		sourceVersion,
		sinkVersion.version
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.filename, sinkVersion.fileName),
		'Filename',
		documentId,
		sourceVersion,
		sourceDoc.filename,
		sinkVersion.fileName
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.mime, sinkVersion.mime),
		'MIME type',
		documentId,
		sourceVersion,
		sourceDoc.mime,
		sinkVersion.mime
	);
	validateField(
		errors,
		compareMappedNumber(sourceDoc.size, sinkVersion.size),
		'Size',
		documentId,
		sourceVersion,
		sourceDoc.size,
		sinkVersion.size
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.fileMD5, sinkVersion.fileMD5),
		'MD5',
		documentId,
		sourceVersion,
		sourceDoc.fileMD5,
		sinkVersion.fileMD5
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.documentId, sinkVersion.horizonDataID),
		'Horizon data ID',
		documentId,
		sourceVersion,
		sourceDoc.documentId,
		sinkVersion.horizonDataID
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.originalFilename, sinkVersion.originalFilename),
		'Original filename',
		documentId,
		sourceVersion,
		sourceDoc.originalFilename,
		sinkVersion.originalFilename
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.description, sinkVersion.description),
		'Description',
		documentId,
		sourceVersion,
		sourceDoc.description,
		sinkVersion.description
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.author, sinkVersion.author),
		'Author',
		documentId,
		sourceVersion,
		sourceDoc.author,
		sinkVersion.author
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.owner, sinkVersion.owner),
		'Owner',
		documentId,
		sourceVersion,
		sourceDoc.owner,
		sinkVersion.owner
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.origin, sinkVersion.origin),
		'Origin',
		documentId,
		sourceVersion,
		sourceDoc.origin,
		sinkVersion.origin
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.caseStage, sinkVersion.stage),
		'Stage',
		documentId,
		sourceVersion,
		sourceDoc.caseStage,
		sinkVersion.stage
	);
	validateField(
		errors,
		compareMappedString(sourceDoc.documentURI, sinkVersion.documentURI),
		'Document URI',
		documentId,
		sourceVersion,
		sourceDoc.documentURI,
		sinkVersion.documentURI
	);
	validateField(
		errors,
		compareMappedDate(sourceDoc.datePublished, sinkVersion.datePublished),
		'Date published',
		documentId,
		sourceVersion,
		sourceDoc.datePublished,
		sinkVersion.datePublished
	);
	validateField(
		errors,
		compareMappedDate(sourceDoc.dateReceived, sinkVersion.dateReceived),
		'Date received',
		documentId,
		sourceVersion,
		sourceDoc.dateReceived,
		sinkVersion.dateReceived
	);
	validateField(
		errors,
		compareMappedDate(sourceDoc.lastModified, sinkVersion.lastModified),
		'Last modified',
		documentId,
		sourceVersion,
		sourceDoc.lastModified,
		sinkVersion.lastModified
	);
}

function validateDocument(
	errors: ValidationError[],
	sourceDocuments: AppealDocument[],
	sinkDocument: SinkDocument
): void {
	const documentId = sinkDocument.guid;

	if (sinkDocument.versions.length !== sourceDocuments.length) {
		errors.push(
			createValidationError(
				'Document',
				'versionCount',
				`Version count mismatch for document ${documentId}: expected ${sourceDocuments.length}, got ${sinkDocument.versions.length}`
			)
		);
		return;
	}

	for (const sourceDoc of sourceDocuments) {
		const sourceVersion = sourceDoc.version ?? 1;
		const sinkVersion = sinkDocument.versions.find((v) => v.version === sourceVersion);

		if (!sinkVersion) {
			errors.push(
				createValidationError(
					'Document',
					'version',
					`Version ${sourceVersion} not found in sink for document ${documentId}`
				)
			);
			continue;
		}

		validateDocumentVersion(errors, sourceDoc, sinkVersion, documentId, sourceVersion);
	}
}

export function validateDocumentMetadata(
	sourceDocuments: AppealDocument[],
	sinkDocuments: SinkDocument[]
): DocumentValidationResult {
	if (sourceDocuments.length === 0 && sinkDocuments.length === 0) {
		return createValidationSuccess();
	}

	const errors: ValidationError[] = [];

	const sourceByDocumentId = new Map<string, AppealDocument[]>();
	for (const doc of sourceDocuments) {
		if (!doc.documentId) {
			errors.push(createValidationError('Document', 'documentId', 'Source document missing documentId'));
			return createValidationFailure(errors);
		}
		const existing = sourceByDocumentId.get(doc.documentId) ?? [];
		existing.push(doc);
		sourceByDocumentId.set(doc.documentId, existing);
	}

	if (sourceByDocumentId.size !== sinkDocuments.length) {
		errors.push(
			createValidationError(
				'Document',
				'documentCount',
				`Document count mismatch: expected ${sourceByDocumentId.size} unique documents, got ${sinkDocuments.length}`
			)
		);
		return createValidationFailure(errors);
	}

	for (const sinkDoc of sinkDocuments) {
		const sourceDocsForId = sourceByDocumentId.get(sinkDoc.guid);

		if (!sourceDocsForId) {
			errors.push(createValidationError('Document', 'guid', `Sink document ${sinkDoc.guid} not found in source`));
			continue;
		}

		validateDocument(errors, sourceDocsForId, sinkDoc);
	}

	return errors.length === 0 ? createValidationSuccess() : createValidationFailure(errors);
}
