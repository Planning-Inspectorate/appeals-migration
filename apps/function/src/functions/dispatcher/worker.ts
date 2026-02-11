import type { InvocationContext } from '@azure/functions';
import { app } from '@azure/functions';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';

type MigrationFunction = (caseToMigrate: CaseToMigrate, context: InvocationContext) => Promise<void>;

async function handleMigration(
	service: FunctionService,
	migrationFunction: MigrationFunction,
	stepIdField: string,
	caseToMigrate: CaseToMigrate,
	context: InvocationContext
): Promise<void> {
	/*
	// TODO enable when implemented
	await service.databaseClient.migrationStep.update({
		where: { id: (caseToMigrate as Record<string, unknown>)[stepIdField] as number },
		data: {
			status: "in-progress",
			startTimestamp: new Date(),
			workerId: context.invocationId
		}
	});
	*/

	try {
		await migrationFunction(caseToMigrate, context);
	} catch (error) {
		context.error(`Failed to migrate ${caseToMigrate.caseReference}`, error);
		// TODO set status to failed and error message when implemented
	}

	await service.databaseClient.migrationStep.update({
		where: { id: (caseToMigrate as Record<string, unknown>)[stepIdField] as number },
		data: {
			inProgress: false,
			complete: true
			// TODO set status = complete / failed
			// TODO set endTimestamp
			// TODO set errorMessage, if any
		}
	});
}

export function createWorker(
	service: FunctionService,
	name: string,
	queueName: string,
	migrationFunction: MigrationFunction,
	stepIdField: string
): void {
	app.serviceBusQueue(name, {
		connection: 'SERVICE_BUS_CONNECTION_STRING',
		queueName,
		handler: async (caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> => {
			await handleMigration(service, migrationFunction, stepIdField, caseToMigrate, context);
		}
	});
}
