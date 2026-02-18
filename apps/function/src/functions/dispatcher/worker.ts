import type { InvocationContext } from '@azure/functions';
import { app } from '@azure/functions';
import type { Prisma } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import { stepStatus, type ItemToMigrate, type MigrationFunction } from '../../types.ts';
import { getStepId } from './common.ts';
import type { StepIdField } from './types.ts';

async function startCaseDocumentsStepIfWaiting(
	transaction: Prisma.TransactionClient,
	migrationItem: ItemToMigrate,
	invocationId: string
): Promise<void> {
	const caseToMigrate = await transaction.caseToMigrate.findUnique({
		where: { caseReference: migrationItem.caseReference },
		select: { documentsStepId: true }
	});

	if (!caseToMigrate) {
		return;
	}

	await transaction.migrationStep.updateMany({
		where: { id: caseToMigrate.documentsStepId },
		data: {
			status: stepStatus.processing,
			invocationId,
			startedAt: new Date()
		}
	});
}

async function completeCaseDocumentsStepIfReady(
	transaction: Prisma.TransactionClient,
	itemToMigrate: ItemToMigrate
): Promise<void> {
	const remainingDocumentCount = await transaction.documentToMigrate.count({
		where: {
			caseReference: itemToMigrate.caseReference,
			MigrationStep: { status: { not: stepStatus.complete } }
		}
	});

	if (remainingDocumentCount > 0) {
		return;
	}

	const caseToMigrate = await transaction.caseToMigrate.findUnique({
		where: { caseReference: itemToMigrate.caseReference },
		select: { documentsStepId: true }
	});

	if (!caseToMigrate) {
		return;
	}

	await transaction.migrationStep.update({
		where: { id: caseToMigrate.documentsStepId },
		data: { status: stepStatus.complete, errorMessage: null, completedAt: new Date() }
	});
}

async function handleMigration(
	service: FunctionService,
	name: string,
	migrationFunction: MigrationFunction,
	stepIdField: StepIdField,
	itemToMigrate: ItemToMigrate,
	context: InvocationContext
): Promise<void> {
	const isDocumentStep = stepIdField === 'migrationStepId';
	const stepIdentifier = getStepId(itemToMigrate, stepIdField);

	await service.databaseClient.$transaction(async (transaction) => {
		await transaction.migrationStep.update({
			where: { id: stepIdentifier },
			data: {
				status: stepStatus.processing,
				invocationId: context.invocationId,
				startedAt: new Date()
			}
		});

		if (isDocumentStep) {
			await startCaseDocumentsStepIfWaiting(transaction, itemToMigrate, context.invocationId);
		}
	});

	const { status, errorMessage } = await migrationFunction(itemToMigrate, context)
		.then(() => ({ status: stepStatus.complete, errorMessage: null }))
		.catch((error) => {
			context.error(`Failed in ${name} for case ${itemToMigrate.caseReference}:`, error);
			return {
				status: stepStatus.failed,
				errorMessage: error instanceof Error ? error.message : String(error)
			};
		});

	await service.databaseClient.$transaction(async (transaction) => {
		await transaction.migrationStep.update({
			where: { id: stepIdentifier },
			data: { status, errorMessage, completedAt: new Date() }
		});

		if (isDocumentStep && status === stepStatus.complete) {
			await completeCaseDocumentsStepIfReady(transaction, itemToMigrate);
		}
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
		handler: async (itemToMigrate: ItemToMigrate, context: InvocationContext): Promise<void> => {
			await handleMigration(service, name, migrationFunction, stepIdField, itemToMigrate, context);
		}
	});
}
