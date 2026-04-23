import type {
	CaseToMigrate,
	PrismaClient as MigrationPrismaClient
} from '@pins/appeals-migration-database/src/client/client.ts';
import { withRetry } from '@pins/appeals-migration-lib/util/retry.ts';
import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';
import { upsertDocumentsToMigrate } from './migration/document-to-migrate.ts';
import { fetchDocumentsByCaseReference } from './source/document.ts';

type Migration = {
	upsertDocumentsToMigrate: typeof upsertDocumentsToMigrate;
};

type Source = {
	fetchDocumentsByCaseReference: typeof fetchDocumentsByCaseReference;
};

const defaultMigration: Migration = {
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
	return async (itemToMigrate, context) => {
		const migrationDatabase = service.databaseClient;
		const sourceDatabase = service.sourceDatabaseClient;
		const caseToMigrate = itemToMigrate as CaseToMigrate;
		const caseReference = caseToMigrate.caseReference;
		context.log(`Processing case: ${caseReference}`);

		const documents = await source.fetchDocumentsByCaseReference(sourceDatabase, caseReference);

		context.log(`Found ${documents.length} documents for case ${caseReference}`);

		await withRetry(() =>
			migrationDatabase.$transaction(async (tx) => {
				await migration.upsertDocumentsToMigrate(tx as MigrationPrismaClient, documents);
			}, service.transactionOptions)
		);

		context.log(`Completed document list for case ${caseReference}`);
	};
}
