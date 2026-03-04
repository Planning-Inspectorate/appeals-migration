import type { DocumentToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';
import { buildBlobStoragePath } from './helpers/map-case-reference-for-storage.ts';
import { mapDocumentToSink } from './mappers/map-document-to-sink.ts';
import { fetchDocumentDetails } from './source/fetch-document-details.ts';
import { validateSourceDocuments } from './validators/validate-source-documents.ts';

export function buildMigrateDocuments(service: FunctionService): MigrationFunction {
	return async (itemToMigrate, context) => {
		const documentToMigrate = itemToMigrate as DocumentToMigrate;
		const { documentId } = documentToMigrate;

		context.log(`Migrating document: ${documentId}`);

		// Fetch all versions of the document from source database
		const sourceDocuments = await fetchDocumentDetails(service.sourceDatabaseClient, documentId);

		// Validate all source documents before any processing to ensure data is good
		validateSourceDocuments(sourceDocuments, documentId);

		const firstDocument = sourceDocuments[0];
		const caseReference = firstDocument.caseReference!;

		context.log(`Found ${sourceDocuments.length} version(s) for document ${documentId}`);

		// Process each document version - copy to blob storage
		for (const doc of sourceDocuments) {
			const versionId = doc.version ?? 1;
			const filename = doc.filename!;

			// Determine blob storage path
			const blobStoragePath = buildBlobStoragePath(caseReference, documentId, versionId, filename);

			context.log(`Copying document version ${versionId} to: ${blobStoragePath}`);

			// Copy document from source to sink blob storage
			try {
				const { filename: fetchedFilename, stream } = await service.sourceDocumentClient.getDocument(documentId, {
					version: versionId > 1 ? versionId : undefined
				});
				const blobClient = service.sinkDocumentClient.getBlockBlobClient(blobStoragePath);
				await blobClient.uploadStream(stream);
				context.log(`Successfully uploaded version ${versionId}: ${fetchedFilename}`);
			} catch (error) {
				context.error(`Failed to upload document version ${versionId}:`, error);
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
			// Note: The case-exists behaviour will be defined in a separate ticket
			throw new Error(`Case ${caseReference} not found in sink database. Migrate the case first.`);
		}

		context.log(`Found case ${caseReference} with ID: ${sinkCase.id}`);

		// TODO: Determine the correct folder ID based on document type/stage
		// For now, using a placeholder folder ID of 1
		const folderId = 1;

		// Map document to sink database models
		const documentData = mapDocumentToSink(sourceDocuments, sinkCase.id, folderId, caseReference);

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
