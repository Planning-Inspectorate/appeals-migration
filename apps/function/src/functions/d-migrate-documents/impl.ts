import type { DocumentToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';
import { buildBlobStoragePath } from './helpers/map-case-reference-for-storage.ts';
import { mapHorizonDocumentTypeAndFolder } from './helpers/map-document-type-to-folder.ts';
import { mapDocumentToSink } from './mappers/map-document-to-sink.ts';
import { fetchDocumentDetails } from './source/fetch-document-details.ts';
import { validateSourceDocuments } from './validators/validate-source-documents.ts';

export function buildMigrateDocuments(service: FunctionService): MigrationFunction {
	// Cache folders per case to avoid repeated database queries during bulk migrations
	const caseFolderCache = new Map<string, Map<string, number>>();
	// Cache case IDs to avoid repeated lookups
	const caseIdCache = new Map<string, number>();

	return async (itemToMigrate, context) => {
		const documentToMigrate = itemToMigrate as DocumentToMigrate;
		const { documentId, caseReference } = documentToMigrate;

		context.log(`Migrating document: ${documentId}`);

		// Fetch all versions of the document from source database
		const sourceDocuments = await fetchDocumentDetails(service.sourceDatabaseClient, documentId);

		// Validate all source documents before any processing to ensure data is good
		validateSourceDocuments(sourceDocuments, documentId);

		const firstDocument = sourceDocuments[0];

		context.log(`Found ${sourceDocuments.length} version(s) for document ${documentId}`);

		// Process each document version - copy to blob storage
		for (const doc of sourceDocuments) {
			const versionId = doc.version ?? 1;
			const filename = doc.filename!;
			const blobStoragePath = buildBlobStoragePath(caseReference, documentId, versionId, filename);

			context.log(`Copying document version ${versionId} to: ${blobStoragePath}`);

			// Copy document from source to sink blob storage
			try {
				const { filename: fetchedFilename, stream } = await service.sourceDocumentClient.getDocument(documentId, {
					version: versionId > 1 ? versionId : undefined
				});

				const sinkBlobClient = service.sinkDocumentClient.getBlockBlobClient(blobStoragePath);
				await sinkBlobClient.uploadStream(stream);

				context.log(`Successfully copied document version ${versionId} (${fetchedFilename})`);
			} catch (error) {
				context.error(`Failed to copy document version ${versionId}: ${error}`);
				throw error;
			}
		}

		// Check if case exists in sink database and get case ID (with caching)
		let caseId = caseIdCache.get(caseReference);

		if (!caseId) {
			const sinkCase = await service.sinkDatabaseClient.appeal.findUnique({
				where: { reference: caseReference },
				select: { id: true }
			});

			if (!sinkCase) {
				context.log(
					`Case ${caseReference} does not exist in sink database - document will be inserted when case is migrated`
				);
				throw new Error(`Case ${caseReference} not found in sink database. Migrate the case first.`);
			}

			caseId = sinkCase.id;
			caseIdCache.set(caseReference, caseId);
		}

		// Map Horizon document type to APPEAL_DOCUMENT_TYPE and get folder path
		const horizonDocumentType = firstDocument.documentType;
		if (!horizonDocumentType) {
			throw new Error(
				`Document ${documentId} for case ${caseReference} has no document type - cannot determine folder mapping`
			);
		}

		const { appealDocumentType, folderPath } = mapHorizonDocumentTypeAndFolder(horizonDocumentType, context);
		context.log(`Mapped '${horizonDocumentType}' -> '${appealDocumentType}' (folder: ${folderPath})`);

		// Helper function to get folder ID with caching
		async function getFolderIdWithCache(caseId: number, path: string): Promise<number> {
			const cacheKey = caseId.toString();

			if (!caseFolderCache.has(cacheKey)) {
				caseFolderCache.set(cacheKey, new Map());
			}

			const caseCache = caseFolderCache.get(cacheKey)!;

			if (caseCache.has(path)) {
				return caseCache.get(path)!;
			}

			// Query folder from database
			const folder = await service.sinkDatabaseClient.folder.findFirst({
				where: {
					caseId,
					path
				},
				select: { id: true }
			});

			if (!folder) {
				throw new Error(
					`Folder not found for case ${caseReference} with path ${path}. Ensure case folders are created.`
				);
			}

			// Cache the result
			caseCache.set(path, folder.id);
			return folder.id;
		}

		// Get folder ID using the cached lookup function
		const folderId = await getFolderIdWithCache(caseId, folderPath);
		context.log(`Using folder ID ${folderId} for path: ${folderPath}`);

		// Map document to sink database models
		const documentData = mapDocumentToSink(
			sourceDocuments,
			caseId,
			folderId,
			caseReference,
			service.documentsContainerName,
			appealDocumentType
		);

		// Insert document and versions in a transaction
		await service.sinkDatabaseClient.$transaction(async (tx) => {
			const createdDocument = await tx.document.create({
				data: documentData,
				include: {
					versions: true
				}
			});

			context.log(
				`Successfully created document ${createdDocument.guid} with ${createdDocument.versions.length} version(s)`
			);
		});

		context.log(`Document migration complete for ${documentId}`);
	};
}
