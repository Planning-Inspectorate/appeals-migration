import { app } from '@azure/functions';
import { initialiseService } from '../init.ts';
import { buildListCasesToMigrate } from './a-list-cases-to-migrate/impl.ts';
import { buildTransformer } from './b-transformer/impl.ts';
import { buildDocumentListBuilder } from './c-document-list-builder/impl.ts';
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

console.log(`registering 'c-document-list-builder' on schedule ${service.cDocumentListBuilderSchedule}`);

app.timer('c-document-list-builder', {
	schedule: service.cDocumentListBuilderSchedule,
	handler: buildDocumentListBuilder(service)
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
