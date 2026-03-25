import { app } from '@azure/functions';
import { initialiseService } from '../init.ts';
import { buildListCasesToMigrate } from './a-list-cases-to-migrate/impl.ts';
import { buildMigrateData } from './b-migrate-data/impl.ts';
import { buildListDocumentsToMigrate } from './c-list-documents-to-migrate/impl.ts';
import { buildMigrateDocuments } from './d-migrate-documents/impl.ts';
import { buildDispatcher } from './dispatcher/dispatcher.ts';
import { buildValidateMigratedCases } from './e-validate-migrated-cases/impl.ts';
import { buildHealthCheck } from './health-check/impl.ts';
import { buildReclaimStaleSteps } from './reclaim-stale-steps/impl.ts';
import { createWorker } from './shared/worker.ts';

const service = initialiseService();

console.log("registering 'health-check'");

app.http('health-check', {
	methods: ['GET'],
	authLevel: 'function',
	handler: buildHealthCheck(service)
});

console.log(`registering 'a-list-cases-to-migrate' on schedule ${service.aListCasesToMigrateSchedule}`);

app.timer('a-list-cases-to-migrate', {
	schedule: service.aListCasesToMigrateSchedule,
	handler: buildListCasesToMigrate(service)
});

console.log(`registering 'dispatcher' on schedule ${service.dispatcherSchedule}`);

app.timer('dispatcher', {
	schedule: service.dispatcherSchedule,
	handler: buildDispatcher(service)
});

console.log(`registering 'reclaim-stale-steps' on schedule ${service.reclaimStaleStepsSchedule}`);

app.timer('reclaim-stale-steps', {
	schedule: service.reclaimStaleStepsSchedule,
	handler: buildReclaimStaleSteps(service)
});

// prettier-ignore
createWorker(
	'b-migrate-data',
	'appeals-migration-migrate-data',
	buildMigrateData,
	'dataStepId'
);

createWorker(
	'c-list-documents-to-migrate',
	'appeals-migration-list-documents-to-migrate',
	buildListDocumentsToMigrate,
	'documentListStepId'
);

// prettier-ignore
createWorker(
	'd-migrate-documents',
	'appeals-migration-migrate-documents',
	buildMigrateDocuments,
	'migrationStepId'
);

createWorker(
	'e-validate-migrated-cases',
	'appeals-migration-validate-migrated-cases',
	buildValidateMigratedCases,
	'validationStepId'
);
