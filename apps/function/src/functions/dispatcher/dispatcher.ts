import type { InvocationContext, Timer, TimerHandler } from '@azure/functions';
import type { Prisma } from '@pins/appeals-migration-database/src/client/client.ts';
import chunk from 'lodash.chunk';
import type { FunctionService } from '../../service.ts';
import { stepStatus, type ItemToMigrate } from '../../types.ts';
import { getStepId } from './common.ts';
import type { StepIdField } from './types.ts';

type DispatchConfig = {
	queueItemType: 'case' | 'document';
	queueName: string;
	where: Prisma.CaseToMigrateWhereInput | Prisma.DocumentToMigrateWhereInput;
	stepIdField: StepIdField;
};

async function getDispatchCount(
	service: FunctionService,
	queueName: string,
	context: InvocationContext
): Promise<number> {
	const properties = await service.serviceBusAdministrationClient.getQueueRuntimeProperties(queueName);
	const activeMessageCount = properties.activeMessageCount;
	context.log(`[${queueName}] Queued: ${activeMessageCount}`);
	return Math.max(0, service.dispatcherQueueTarget - activeMessageCount);
}

async function getItemsToMigrate(
	config: DispatchConfig,
	service: FunctionService,
	dispatchCount: number
): Promise<ItemToMigrate[]> {
	return await service.databaseClient.$transaction(async (transaction) => {
		const selected: ItemToMigrate[] =
			config.queueItemType === 'case'
				? await transaction.caseToMigrate.findMany({
						where: config.where as Prisma.CaseToMigrateWhereInput,
						take: dispatchCount
					})
				: await transaction.documentToMigrate.findMany({
						where: config.where as Prisma.DocumentToMigrateWhereInput,
						take: dispatchCount
					});

		const ids = selected.map((row) => getStepId(row, config.stepIdField));
		for (const idsChunk of chunk(ids, service.migrationStepUpdateChunkSize)) {
			await transaction.migrationStep.updateMany({
				where: { id: { in: idsChunk } },
				data: { status: stepStatus.queued }
			});
		}
		return selected;
	});
}

async function dispatch(config: DispatchConfig, service: FunctionService, context: InvocationContext): Promise<void> {
	const dispatchCount = await getDispatchCount(service, config.queueName, context);

	context.log(`[${config.queueName}] Needed: ${dispatchCount}`);
	if (dispatchCount === 0) {
		return;
	}

	const queueItems = await getItemsToMigrate(config, service, dispatchCount);
	if (queueItems.length === 0) {
		context.log(`[${config.queueName}] No cases to migrate.`);
		return;
	}

	const sender = service.serviceBusClient.createSender(config.queueName);

	try {
		let batch = await sender.createMessageBatch();

		for (const body of queueItems) {
			const message = {
				body,
				contentType: 'application/json',
				subject: 'migration-job'
			};

			if (!batch.tryAddMessage(message)) {
				await sender.sendMessages(batch);
				batch = await sender.createMessageBatch();
				context.log(`[${config.queueName}] Dispatched: ${batch.count}`);
				if (!batch.tryAddMessage(message)) {
					throw new Error(`Message too large to fit in a batch: ${JSON.stringify(body)}`);
				}
			}
		}

		if (batch.count > 0) {
			await sender.sendMessages(batch);
			context.log(`[${config.queueName}] Dispatched: ${batch.count}`);
		}
	} finally {
		await sender.close();
	}
}

async function drain(config: DispatchConfig, service: FunctionService, context: InvocationContext): Promise<void> {
	const databaseClient = service.databaseClient;
	const receiver = service.serviceBusClient.createReceiver(config.queueName, { receiveMode: 'peekLock' });
	let total = 0;

	try {
		while (true) {
			const messages = await receiver.receiveMessages(service.migrationStepUpdateChunkSize, { maxWaitTimeInMs: 5000 });
			if (messages.length === 0) {
				break;
			}

			await databaseClient.migrationStep.updateMany({
				where: {
					id: {
						in: messages.map((message) => getStepId(message.body as ItemToMigrate, config.stepIdField))
					}
				},
				data: { status: stepStatus.waiting }
			});

			if (config.queueName === 'documents-step') {
				const caseReferences = [...new Set(messages.map((message) => (message.body as ItemToMigrate).caseReference))];
				const cases = await databaseClient.caseToMigrate.findMany({
					where: { caseReference: { in: caseReferences } },
					select: { documentsStepId: true }
				});

				const ids = cases.map((caseToMigrate) => caseToMigrate.documentsStepId);
				for (const idsChunk of chunk(ids, service.migrationStepUpdateChunkSize)) {
					await databaseClient.migrationStep.updateMany({
						where: {
							id: { in: idsChunk },
							status: stepStatus.processing
						},
						data: { status: stepStatus.waiting }
					});
				}
			}

			for (const messagesChunk of chunk(messages, service.serviceBusParallelism)) {
				await Promise.all(messagesChunk.map((message) => receiver.completeMessage(message)));
			}

			total += messages.length;
		}
	} finally {
		await receiver.close();
	}

	context.log(`[${config.queueName}] Drained: ${total}`);
}

function isEndOfWindow(service: FunctionService): boolean {
	const { endHour, endMinutes } = service.dispatcherEndWindow;
	const now = new Date();
	return now.getHours() === endHour && now.getMinutes() >= endMinutes;
}

export function buildDispatcher(service: FunctionService): TimerHandler {
	const configs: DispatchConfig[] = [
		{
			queueItemType: 'case',
			queueName: 'data-step',
			where: { DataStep: { status: stepStatus.waiting } },
			stepIdField: 'dataStepId'
		},
		{
			queueItemType: 'case',
			queueName: 'document-list-step',
			where: {
				DataStep: { status: stepStatus.complete },
				DocumentListStep: { status: stepStatus.waiting }
			},
			stepIdField: 'documentListStepId'
		},
		{
			queueItemType: 'document',
			queueName: 'documents-step',
			where: {
				MigrationStep: { status: stepStatus.waiting },
				CaseToMigrate: {
					DataStep: { status: stepStatus.complete },
					DocumentListStep: { status: stepStatus.complete },
					DocumentsStep: { status: { in: [stepStatus.waiting, stepStatus.processing] } }
				}
			} as Prisma.DocumentToMigrateWhereInput,
			stepIdField: 'migrationStepId'
		},
		{
			queueItemType: 'case',
			queueName: 'validation-step',
			where: {
				DataStep: { status: stepStatus.complete },
				DocumentListStep: { status: stepStatus.complete },
				DocumentsStep: { status: stepStatus.complete },
				ValidationStep: { status: stepStatus.waiting }
			},
			stepIdField: 'validationStepId'
		}
	];

	return async (timer: Timer, context: InvocationContext): Promise<void> => {
		const action = isEndOfWindow(service) ? drain : dispatch;
		context.log(`mode: ${action.name}`);
		for (const config of configs) {
			await action(config, service, context);
		}
	};
}
