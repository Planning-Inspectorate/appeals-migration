import { app } from '@azure/functions';
import { initialiseService } from '../init.ts';
import { buildListCasesToMigrate } from './a-list-cases-to-migrate/impl.ts';
import { buildMigrateData } from './b-migrate-data/impl.ts';
import { buildListDocumentsToMigrate } from './c-list-documents-to-migrate/impl.ts';
import { buildMigrateDocuments } from './d-migrate-documents/impl.ts';
import { buildDispatcher } from './dispatcher/dispatcher.ts';
import { createWorker } from './dispatcher/worker.ts';
import { buildValidateMigratedCases } from './e-validate-migrated-cases/impl.ts';

const service = initialiseService();

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

// prettier-ignore
createWorker(
	service,
	'b-migrate-data',
	'data-step',
	buildMigrateData(service),
	'dataStepId'
);

createWorker(
	service,
	'c-list-documents-to-migrate',
	'document-list-step',
	buildListDocumentsToMigrate(service),
	'documentListStepId'
);

// prettier-ignore
createWorker(
	service,
	'd-migrate-documents',
	'documents-step',
	buildMigrateDocuments(service),
	'migrationStepId'
);

createWorker(
	service,
	'e-validate-migrated-cases',
	'validation-step',
	buildValidateMigratedCases(service),
	'validationStepId'
);
