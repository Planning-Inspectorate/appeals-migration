import { app } from '@azure/functions';
import { initialiseService } from '../init.ts';
import { buildListCasesToMigrate } from './a-list-cases-to-migrate/impl.ts';
import { buildTransformer } from './b-transformer/impl.ts';
import { buildListDocumentsToMigrate } from './c-list-documents-to-migrate/impl.ts';
import { buildMigrateDocuments } from './d-migrate-documents/impl.ts';
import { buildValidateMigratedCases } from './e-validate-migrated-cases/impl.ts';

const service = initialiseService();

console.log(`registering 'a-list-cases-to-migrate' on schedule ${service.aListCasesToMigrateSchedule}`);

app.timer('a-list-cases-to-migrate', {
	schedule: service.aListCasesToMigrateSchedule,
	handler: buildListCasesToMigrate(service)
});

console.log(`registering 'b-transformer' on schedule ${service.bTransformerSchedule}`);

app.timer('b-transformer', {
	schedule: service.bTransformerSchedule,
	handler: buildTransformer(service)
});

console.log(`registering 'c-list-documents-to-migrate' on schedule ${service.cListDocumentsToMigrateSchedule}`);

app.timer('c-list-documents-to-migrate', {
	schedule: service.cListDocumentsToMigrateSchedule,
	handler: buildListDocumentsToMigrate(service)
});

console.log(`registering 'd-migrate-documents' on schedule ${service.dMigrateDocumentsSchedule}`);

app.timer('d-migrate-documents', {
	schedule: service.dMigrateDocumentsSchedule,
	handler: buildMigrateDocuments(service)
});

console.log(`registering 'e-validate-migrated-cases' on schedule ${service.eValidateMigratedCasesSchedule}`);

app.timer('e-validate-migrated-cases', {
	schedule: service.eValidateMigratedCasesSchedule,
	handler: buildValidateMigratedCases(service)
});
