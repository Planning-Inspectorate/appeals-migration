import type { InvocationContext } from '@azure/functions';
import { app } from '@azure/functions';
import { newDatabaseClient } from '@pins/appeals-migration-database';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import { dataStep, documentListStep, documentStep, validationStep } from './simulate.ts';

type MigrationFunction = (caseToMigrate: CaseToMigrate, context: InvocationContext) => Promise<void>;

async function handleMigration(
	migrationFunction: MigrationFunction,
	fieldName: string,
	caseToMigrate: CaseToMigrate,
	context: InvocationContext
): Promise<void> {
	await migrationFunction(caseToMigrate, context);

	const databaseConnectionString = process.env.SQL_CONNECTION_STRING;
	if (!databaseConnectionString) {
		throw new Error('Missing SQL_CONNECTION_STRING application setting.');
	}

	const prisma = newDatabaseClient(databaseConnectionString);
	try {
		await prisma.migrationStep.update({
			where: { id: (caseToMigrate as any)[fieldName] as number },
			data: { inProgress: false, complete: true }
		});
	} finally {
		await prisma.$disconnect();
	}
}

function createWorker(name: string, queueName: string, migrationFunction: MigrationFunction, fieldName: string): void {
	app.serviceBusQueue(name, {
		connection: 'SERVICE_BUS_CONNECTION',
		queueName,
		handler: async (caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> => {
			await handleMigration(migrationFunction, fieldName, caseToMigrate, context);
		}
	});
}

createWorker('dataStep', 'data-step', dataStep, 'dataStepId');
createWorker('documentListStep', 'document-list-step', documentListStep, 'documentListStepId');
createWorker('documentStep', 'document-step', documentStep, 'documentStepId');
createWorker('validationStep', 'validation-step', validationStep, 'validationStepId');
