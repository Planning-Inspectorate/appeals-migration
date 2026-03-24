import { buildListDocumentsToMigrate } from '../functions/c-list-documents-to-migrate/impl.ts';
import { handleMigration } from '../functions/shared/worker.ts';
import { cleanup, getCase, mockContext } from './util.ts';

/**
 * A script for local testing
 */
async function run() {
	const { service, caseToMigrate } = await getCase();
	const migrator = buildListDocumentsToMigrate(service);
	await handleMigration(service, 'list-documents', migrator, 'documentListStepId', caseToMigrate, mockContext());
	await cleanup(service);
}

run();
