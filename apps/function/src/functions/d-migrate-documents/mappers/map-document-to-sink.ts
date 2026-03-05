import type { Prisma } from '@pins/manage-appeals-database/src/client/client.d.ts';
import type { AppealDocument } from '@pins/odw-curated-database/src/client/client.ts';
import { parseDateOrUndefined } from '../../shared/helpers/index.ts';
import { buildBlobStoragePath } from '../helpers/map-case-reference-for-storage.ts';

const DEFAULT_SOURCE_SYSTEM = 'horizon';
const DEFAULT_VIRUS_STATUS = 'not_scanned';

export function mapDocumentToSink(
	sourceDocuments: AppealDocument[],
	caseId: number,
	folderId: number,
	caseReference: string
): Prisma.DocumentUncheckedCreateInput {
	if (sourceDocuments.length === 0) {
		throw new Error('No source documents provided for mapping');
	}

	const firstDocument = sourceDocuments[0];
	const documentId = firstDocument.documentId;

	if (!documentId) {
		throw new Error('Document ID is required');
	}

	if (!sourceDocuments.every((doc) => doc.documentId === documentId)) {
		throw new Error('All source documents must share the same documentId');
	}

	if (!firstDocument.filename) {
		throw new Error('Document filename is required');
	}

	sourceDocuments.forEach((doc, index) => {
		if (!doc.filename) {
			throw new Error(`Document filename is required for all versions (missing at index ${index})`);
		}
	});

	const versions = sourceDocuments.map((doc, index) => {
		const versionNumber = doc.version ?? index + 1;
		const blobStoragePath = buildBlobStoragePath(caseReference, documentId, versionNumber, doc.filename!);

		return {
			version: versionNumber,
			lastModified: parseDateOrUndefined(doc.lastModified),
			documentType: doc.documentType,
			published: false, // Placeholder - will be mapped in full implementation
			draft: true, // Placeholder - will be mapped in full implementation
			sourceSystem: doc.sourceSystem ?? DEFAULT_SOURCE_SYSTEM,
			virusCheckStatus: doc.virusCheckStatus ?? DEFAULT_VIRUS_STATUS,
			origin: doc.origin,
			originalFilename: doc.originalFilename,
			fileName: doc.filename,
			description: doc.description,
			owner: doc.owner,
			author: doc.author,
			mime: doc.mime,
			horizonDataID: doc.documentId ?? documentId, // Fallback to validated documentId
			fileMD5: doc.fileMD5,
			size: doc.size,
			stage: doc.caseStage,
			blobStorageContainer: undefined, // Will be set by environment configuration
			blobStoragePath,
			documentURI: doc.documentURI,
			dateCreated: parseDateOrUndefined(doc.dateCreated) ?? new Date(),
			datePublished: parseDateOrUndefined(doc.datePublished),
			dateReceived: parseDateOrUndefined(doc.dateReceived),
			isDeleted: false,
			isLateEntry: undefined, // Placeholder - will be mapped in full implementation
			redactionStatusId: undefined // Placeholder - no source mapping available
		} satisfies Prisma.DocumentVersionUncheckedCreateWithoutDocumentInput;
	});

	const latestVersionId = Math.max(...versions.map((v) => v.version));

	return {
		guid: documentId,
		name: firstDocument.filename,
		caseId,
		folderId,
		createdAt: parseDateOrUndefined(firstDocument.dateCreated) ?? new Date(),
		isDeleted: false,
		latestVersionId,
		versions: {
			create: versions
		}
	};
}
