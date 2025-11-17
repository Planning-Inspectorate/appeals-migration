import { app } from '@azure/functions';
import { initialiseService } from '../init.ts';
import { buildListBuilder } from './a-list-builder/impl.ts';
import { buildTransformer } from './b-transformer/impl.ts';
import { buildDocumentHandler } from './c-document-handler/impl.ts';
import { buildValidator } from './d-validator/impl.ts';

const service = initialiseService();

console.log(`registering 'a-list-builder' on schedule ${service.aListBuilderSchedule}`);

app.timer('a-list-builder', {
	schedule: service.aListBuilderSchedule,
	handler: buildListBuilder(service)
});

console.log(`registering 'b-transformer' on schedule ${service.bTransformerSchedule}`);

app.timer('b-transformer', {
	schedule: service.bTransformerSchedule,
	handler: buildTransformer(service)
});

console.log(`registering 'c-document-handler' on schedule ${service.cDocumentHandlerSchedule}`);

app.timer('c-document-handler', {
	schedule: service.cDocumentHandlerSchedule,
	handler: buildDocumentHandler(service)
});

console.log(`registering 'd-validator' on schedule ${service.dValidatorSchedule}`);

app.timer('d-validator', {
	schedule: service.dValidatorSchedule,
	handler: buildValidator(service)
});
