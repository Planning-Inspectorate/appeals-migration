import {
	findAvailableCaseForDocumentList,
	processDocumentListStep,
	markDocumentListStepComplete
} from './migration/case-to-migrate.ts';
import { fetchDocumentsByCaseReference } from './source/document.ts';
import { upsertDocumentsToMigrate } from './migration/document-to-migrate.ts';

import type { FunctionService } from '../../service.ts';
import type { TimerHandler } from '@azure/functions';
import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';

type Migration = {
	findAvailableCaseForDocumentList: typeof findAvailableCaseForDocumentList;
	processDocumentListStep: typeof processDocumentListStep;
	markDocumentListStepComplete: typeof markDocumentListStepComplete;
	upsertDocumentsToMigrate: typeof upsertDocumentsToMigrate;
};

type Source = {
	fetchDocumentsByCaseReference: typeof fetchDocumentsByCaseReference;
};

const defaultMigration: Migration = {
	findAvailableCaseForDocumentList,
	processDocumentListStep,
	markDocumentListStepComplete,
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

			// Step 1: Find an available case (read-only, no lock)
			const availableCase = await migration.findAvailableCaseForDocumentList(migrationDatabase);

			if (!availableCase) {
				context.log('No cases ready for document list building');
				return;
			}

			context.log(`Processing case: ${availableCase.caseReference}`);
			// Step 2: Fetch documents from source database (outside transaction)
			const documents = await source.fetchDocumentsByCaseReference(sourceDatabase, availableCase.caseReference);

			context.log(`Found ${documents.length} documents for case ${availableCase.caseReference}`);

			// Step 3: Process document list step in a single transaction
			// If anything fails, the entire transaction rolls back
			const processed = await migrationDatabase.$transaction(async (tx) => {
				const processSucceeded = await migration.processDocumentListStep(
					tx as MigrationPrismaClient,
					availableCase.documentListStepId
				);

				if (!processSucceeded) {
					return false;
				}

				await migration.upsertDocumentsToMigrate(tx as MigrationPrismaClient, documents);

				await migration.markDocumentListStepComplete(tx as MigrationPrismaClient, availableCase.documentListStepId);

				return true;
			});

			if (!processed) {
				context.log(`Case ${availableCase.caseReference} was processed by another instance`);
				return;
			}

			context.log(`Completed document list for case ${availableCase.caseReference}`);
		} catch (error) {
			context.error('Error during document list builder run', error);
			throw error;
		}
	};
}
