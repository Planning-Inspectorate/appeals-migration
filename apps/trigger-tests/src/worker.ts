import type { InvocationContext } from '@azure/functions';
import { app } from '@azure/functions';
import { newDatabaseClient } from '@pins/appeals-migration-database';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import { dataStep, documentListStep, documentStep, validationStep } from './simulate.ts';

type MigrationFunction = (caseToMigrate: CaseToMigrate, context: InvocationContext) => Promise<void>;

async function handleMigration(
	migrationFunction: MigrationFunction,
	stepIdField: string,
	caseToMigrate: CaseToMigrate,
	context: InvocationContext
): Promise<void> {
	try {
		await migrationFunction(caseToMigrate, context);
	} catch (error) {
		context.error(`Failed to migrate ${caseToMigrate.caseReference}`, error);
		// TODO set status to failed and error message when implemented
	}

	const databaseConnectionString = process.env.SQL_CONNECTION_STRING;
	if (!databaseConnectionString) {
		throw new Error('Missing SQL_CONNECTION_STRING application setting.');
	}

	const prisma = newDatabaseClient(databaseConnectionString);
	try {
		await prisma.migrationStep.update({
			where: { id: (caseToMigrate as Record<string, unknown>)[stepIdField] as number },
			data: {
				inProgress: false,
				complete: true
				// TODO set status, errorMessage, endTimestamp
			}
		});
	} finally {
		await prisma.$disconnect();
	}
}

function createWorker(
	name: string,
	queueName: string,
	migrationFunction: MigrationFunction,
	stepIdField: string
): void {
	app.serviceBusQueue(name, {
		connection: 'SERVICE_BUS_CONNECTION',
		queueName,
		handler: async (caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> => {
			await handleMigration(migrationFunction, stepIdField, caseToMigrate, context);
		}
	});
}

createWorker('dataStep', 'data-step', dataStep, 'dataStepId');
createWorker('documentListStep', 'document-list-step', documentListStep, 'documentListStepId');
createWorker('documentsStep', 'documents-step', documentStep, 'documentsStepId');
createWorker('validationStep', 'validation-step', validationStep, 'validationStepId');
