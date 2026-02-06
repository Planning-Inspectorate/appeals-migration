import { claimNextCaseForDocumentList, updateDocumentListStepComplete } from './migration/case-to-migrate.ts';
import { fetchDocumentsByCaseReference } from './source/document.ts';
import { upsertDocumentsToMigrate } from './migration/document-to-migrate.ts';

import type { FunctionService } from '../../service.ts';
import type { TimerHandler } from '@azure/functions';
import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';

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
): TimerHandler {
	return async (_timer, context) => {
		try {
			const migrationDatabase = service.databaseClient;
			const sourceDatabase = service.sourceDatabaseClient;

			// Step 1: Atomically claim a case for processing
			const claimedCase = await migration.claimNextCaseForDocumentList(migrationDatabase);

			if (!claimedCase) {
				context.log('No cases ready for document list building');
				return;
			}

			const caseReference = claimedCase.caseReference;
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
