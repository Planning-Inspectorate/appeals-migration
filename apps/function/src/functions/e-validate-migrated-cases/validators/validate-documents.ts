import type { AppealDocument } from '@pins/odw-curated-database/src/client/client.ts';
import type { SinkDocumentClient } from '../../../types.ts';
import { buildBlobStoragePath } from '../../d-migrate-documents/helpers/map-case-reference-for-storage.ts';
import type { DocumentValidationResult, ValidationError } from '../types/validation-types.ts';
import { createValidationError, createValidationFailure, createValidationSuccess } from '../types/validation-types.ts';

export async function validateDocuments(
	documents: AppealDocument[],
	sinkDocumentClient: SinkDocumentClient
): Promise<DocumentValidationResult> {
	if (documents.length === 0) {
		return createValidationSuccess();
	}

	const errors: ValidationError[] = [];

	for (const doc of documents) {
		const caseReference = doc.caseReference;
		const documentId = doc.documentId;
		const version = doc.version ?? 1;
		const filename = doc.filename;

		if (!caseReference || !filename) {
			errors.push(
				createValidationError(
					'Document',
					'caseReference/filename',
					`Document ${documentId} missing caseReference or filename`
				)
			);
			continue;
		}

		const blobPath = buildBlobStoragePath(caseReference, documentId, version, filename);
		const blobClient = sinkDocumentClient.getBlockBlobClient(blobPath);
		const exists = await blobClient.exists();

		if (!exists) {
			errors.push(createValidationError('Document', 'blobStorage', `Document not found in blob storage: ${blobPath}`));
			continue;
		}

		const properties = await blobClient.getProperties();

		if (doc.size !== null && properties.contentLength !== doc.size) {
			errors.push(
				createValidationError(
					'Document',
					'size',
					`Document ${blobPath} size mismatch: expected ${doc.size}, got ${properties.contentLength}`
				)
			);
		}

		if (doc.mime && properties.contentType !== doc.mime) {
			errors.push(
				createValidationError(
					'Document',
					'mime',
					`Document ${blobPath} MIME mismatch: expected ${doc.mime}, got ${properties.contentType}`
				)
			);
		}

		if (doc.fileMD5 && properties.contentMD5) {
			const blobMD5 = Buffer.from(properties.contentMD5).toString('hex');
			if (blobMD5 !== doc.fileMD5) {
				errors.push(
					createValidationError(
						'Document',
						'fileMD5',
						`Document ${blobPath} MD5 mismatch: expected ${doc.fileMD5}, got ${blobMD5}`
					)
				);
			}
		}
	}

	return errors.length === 0 ? createValidationSuccess() : createValidationFailure(errors);
}
