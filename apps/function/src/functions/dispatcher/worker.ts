import type { InvocationContext } from '@azure/functions';
import { app } from '@azure/functions';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import { stepStatus, type MigrationFunction } from '../../types.ts';
import type { StepIdField } from './types.ts';

async function handleMigration(
	service: FunctionService,
	name: string,
	migrationFunction: MigrationFunction,
	stepIdField: StepIdField,
	caseToMigrate: CaseToMigrate,
	context: InvocationContext
): Promise<void> {
	await service.databaseClient.migrationStep.update({
		where: { id: caseToMigrate[stepIdField] },
		data: {
			status: stepStatus.processing,
			invocationId: context.invocationId,
			startedAt: new Date()
		}
	});

	const { status, errorMessage } = await migrationFunction(caseToMigrate, context)
		.then(() => ({ status: stepStatus.complete, errorMessage: null }))
		.catch((error) => {
			context.error(`Failed in ${name} for case ${caseToMigrate.caseReference}:`, error);
			return {
				status: stepStatus.failed,
				errorMessage: error instanceof Error ? error.message : String(error)
			};
		});

	await service.databaseClient.migrationStep.update({
		where: { id: caseToMigrate[stepIdField] },
		data: { status, errorMessage, completedAt: new Date() }
	});
}

export function createWorker(
	service: FunctionService,
	name: string,
	queueName: string,
	migrationFunction: MigrationFunction,
	stepIdField: StepIdField
): void {
	app.serviceBusQueue(name, {
		connection: 'SERVICE_BUS_CONNECTION_STRING',
		queueName,
		handler: async (caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> => {
			await handleMigration(service, name, migrationFunction, stepIdField, caseToMigrate, context);
		}
	});
}
