import { claimNextCaseForDocumentList, updateDocumentListStepComplete } from './migration/case-to-migrate.ts';
import { upsertDocumentsToMigrate } from './migration/document-to-migrate.ts';
import { fetchDocumentsByCaseReference } from './source/document.ts';

import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';

type Migration = {
	claimNextCaseForDocumentList: typeof claimNextCaseForDocumentList;
	updateDocumentListStepComplete: typeof updateDocumentListStepComplete;
	upsertDocumentsToMigrate: typeof upsertDocumentsToMigrate;
};

type Source = {
	fetchDocumentsByCaseReference: typeof fetchDocumentsByCaseReference;
};

const defaultMigration: Migration = {
	claimNextCaseForDocumentList,
	updateDocumentListStepComplete,
	upsertDocumentsToMigrate
};

const defaultSource: Source = {
	fetchDocumentsByCaseReference
};

export function buildListDocumentsToMigrate(
	service: FunctionService,
	migration: Migration = defaultMigration,
	source: Source = defaultSource
): MigrationFunction {
	return async (caseToMigrate, context) => {
		try {
			const migrationDatabase = service.databaseClient;
			const sourceDatabase = service.sourceDatabaseClient;
			const caseReference = caseToMigrate.caseReference;
			context.log(`Processing case: ${caseReference}`);

			// Step 2: Fetch documents from source database
			const documents = await source.fetchDocumentsByCaseReference(sourceDatabase, caseReference);

			context.log(`Found ${documents.length} documents for case ${caseReference}`);

			// Step 3: Upsert documents to migration database
			await migrationDatabase.$transaction(async (tx) => {
				await migration.upsertDocumentsToMigrate(tx as MigrationPrismaClient, documents);
			});

			// Step 4: Mark the document list step as complete
			await migration.updateDocumentListStepComplete(migrationDatabase, caseReference, true);

			context.log(`Completed document list for case ${caseReference}`);
		} catch (error) {
			context.error('Error during document list builder run', error);
			throw error;
		}
	};
}
