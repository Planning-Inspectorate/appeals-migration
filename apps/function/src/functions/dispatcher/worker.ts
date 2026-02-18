import type { InvocationContext } from '@azure/functions';
import { app } from '@azure/functions';
import type { Prisma } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import { stepStatus, type ItemToMigrate, type MigrationFunction } from '../../types.ts';
import { getStepId } from './common.ts';
import type { StepIdField } from './types.ts';

async function startCaseDocumentsStepIfWaiting(
	transaction: Prisma.TransactionClient,
	migrationItem: ItemToMigrate
): Promise<void> {
	const caseToMigrate = await transaction.caseToMigrate.findUnique({
		where: { caseReference: migrationItem.caseReference },
		select: { documentsStepId: true }
	});

	if (!caseToMigrate) {
		return;
	}

	await transaction.migrationStep.updateMany({
		where: {
			id: caseToMigrate.documentsStepId,
			status: stepStatus.waiting
		},
		data: {
			status: stepStatus.processing,
			startedAt: new Date()
		}
	});
}

async function completeCaseDocumentsStepIfFinished(
	transaction: Prisma.TransactionClient,
	itemToMigrate: ItemToMigrate
): Promise<void> {
	const lockedCasesToMigrate = await transaction.$queryRaw<Array<{ documentsStepId: number }>>`
		SELECT [documentsStepId]
		FROM [CaseToMigrate] WITH (UPDLOCK, HOLDLOCK)
		WHERE [caseReference] = ${itemToMigrate.caseReference}
	`;

	const caseToMigrate = lockedCasesToMigrate[0];
	if (!caseToMigrate) {
		return;
	}

	const remainingDocumentCount = await transaction.documentToMigrate.count({
		where: {
			caseReference: itemToMigrate.caseReference,
			MigrationStep: { status: { notIn: [stepStatus.complete, stepStatus.failed] } }
		}
	});

	if (remainingDocumentCount > 0) {
		return;
	}

	const failedDocumentCount = await transaction.documentToMigrate.count({
		where: {
			caseReference: itemToMigrate.caseReference,
			MigrationStep: { status: stepStatus.failed }
		}
	});

	const status = failedDocumentCount === 0 ? stepStatus.complete : stepStatus.failed;

	await transaction.migrationStep.update({
		where: { id: caseToMigrate.documentsStepId },
		data: { status, completedAt: new Date() }
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
	const stepId = getStepId(itemToMigrate, stepIdField);

	await service.databaseClient.$transaction(async (transaction) => {
		await transaction.migrationStep.update({
			where: { id: stepId },
			data: {
				status: stepStatus.processing,
				invocationId: context.invocationId,
				startedAt: new Date()
			}
		});

		if (isDocumentStep) {
			await startCaseDocumentsStepIfWaiting(transaction, itemToMigrate);
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
			where: { id: stepId },
			data: { status, errorMessage, completedAt: new Date() }
		});

		if (isDocumentStep) {
			await completeCaseDocumentsStepIfFinished(transaction, itemToMigrate);
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
