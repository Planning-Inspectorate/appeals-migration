import { buildMigrateData } from '../functions/b-migrate-data/impl.ts';
import { handleMigration } from '../functions/shared/worker.ts';
import { cleanup, getCase, mockContext } from './util.ts';

/**
 * A script for local testing
 */
async function run() {
	const { service, caseToMigrate } = await getCase();
	const migrator = buildMigrateData(service);
	await handleMigration(service, 'list-documents', migrator, 'dataStepId', caseToMigrate, mockContext());
	await cleanup(service);
}

run();
