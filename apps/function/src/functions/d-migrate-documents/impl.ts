import type { DocumentToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';
import { buildBlobStoragePath } from './helpers/map-case-reference-for-storage.ts';
import { getFolderPathForDocumentType } from './helpers/map-document-type-to-folder.ts';
import { mapDocumentToSink } from './mappers/map-document-to-sink.ts';
import { fetchDocumentDetails } from './source/fetch-document-details.ts';
import { validateSourceDocuments } from './validators/validate-source-documents.ts';

export function buildMigrateDocuments(service: FunctionService): MigrationFunction {
	// Cache folders per case to avoid repeated database queries during bulk migrations
	const caseFolderCache = new Map<string, Map<string, number>>();

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

		// Check if case exists in sink database and get case ID
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

		// Determine the correct folder based on document type
		const documentType = firstDocument.documentType;
		const folderPath = getFolderPathForDocumentType(documentType);

		// Helper function to get folder ID with caching
		async function getFolderIdWithCache(caseId: number, path: string | undefined): Promise<number> {
			const cacheKey = caseId.toString();

			// Initialize cache for this case if not exists
			if (!caseFolderCache.has(cacheKey)) {
				caseFolderCache.set(cacheKey, new Map());
			}

			const caseCache = caseFolderCache.get(cacheKey)!;

			// If no specific folder path, use default folder lookup
			if (!path) {
				const defaultCacheKey = 'default';
				if (caseCache.has(defaultCacheKey)) {
					return caseCache.get(defaultCacheKey)!;
				}

				const defaultFolder = await service.sinkDatabaseClient.folder.findFirst({
					where: { caseId },
					select: { id: true },
					orderBy: { id: 'asc' }
				});

				if (!defaultFolder) {
					throw new Error(`No folders found for case ${caseReference}. Ensure case folders are created.`);
				}

				caseCache.set(defaultCacheKey, defaultFolder.id);
				return defaultFolder.id;
			}

			// Check cache for specific folder path
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
		const folderId = await getFolderIdWithCache(sinkCase.id, folderPath);

		// Log the folder assignment for clarity
		if (folderPath) {
			context.log(`Using folder ID ${folderId} for document type '${documentType}' (path: ${folderPath})`);
		} else {
			context.log(`Using default folder ID ${folderId} for document type '${documentType}'`);
		}

		// Map document to sink database models
		const documentData = mapDocumentToSink(
			sourceDocuments,
			sinkCase.id,
			folderId,
			caseReference,
			service.documentsContainerName
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
