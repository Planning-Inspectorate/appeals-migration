import { buildValidateMigratedCases } from '../functions/e-validate-migrated-cases/impl.ts';
import { handleMigration } from '../functions/shared/worker.ts';
import { cleanup, getCase, mockContext } from './util.ts';

/**
 * A script for local testing
 */
async function run() {
	const { service, caseToMigrate } = await getCase();
	const migrator = buildValidateMigratedCases(service);
	await handleMigration(service, 'validate', migrator, 'validationStepId', caseToMigrate, mockContext());
	await cleanup(service);
}

run();
