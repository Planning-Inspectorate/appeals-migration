import { buildMigrateDocuments } from '../functions/d-migrate-documents/impl.ts';
import { handleMigration } from '../functions/shared/worker.ts';
import { initialiseService } from '../init.ts';
import { cleanup, mockContext } from './util.ts';

/**
 * A script for local testing
 */
async function run() {
	if (process.argv.length === 3) {
		throw new Error('documentId is required');
	}
	const documentId = process.argv[2];
	console.log('running for', documentId);
	const service = initialiseService();
	const documentToMigrate = await service.databaseClient.documentToMigrate.findUnique({
		where: { documentId }
	});
	if (!documentToMigrate) {
		throw new Error(`documentToMigrate with reference ${documentId} not found`);
	}
	const migrator = buildMigrateDocuments(service);
	await handleMigration(service, 'migrate-document', migrator, 'migrationStepId', documentToMigrate, mockContext());
	await cleanup(service);
}

run();
