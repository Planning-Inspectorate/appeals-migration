import { app } from '@azure/functions';
import { initialiseService } from '../init.ts';
import { buildListCasesToMigrate } from './a-list-cases-to-migrate/impl.ts';
import { buildTransformer } from './b-transformer/impl.ts';
import { buildListDocumentsToMigrate } from './c-list-documents-to-migrate/impl.ts';
import { buildDocumentHandler } from './d-document-handler/impl.ts';
import { buildValidator } from './e-validator/impl.ts';

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

console.log(`registering 'd-document-handler' on schedule ${service.dDocumentHandlerSchedule}`);

app.timer('d-document-handler', {
	schedule: service.dDocumentHandlerSchedule,
	handler: buildDocumentHandler(service)
});

console.log(`registering 'e-validator' on schedule ${service.eValidatorSchedule}`);

app.timer('e-validator', {
	schedule: service.eValidatorSchedule,
	handler: buildValidator(service)
});
