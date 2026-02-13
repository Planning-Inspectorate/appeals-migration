import type { InvocationContext, Timer, TimerHandler } from '@azure/functions';
import type { CaseToMigrate, Prisma } from '@pins/appeals-migration-database/src/client/client.ts';
import chunk from 'lodash.chunk';
import type { FunctionService } from '../../service.ts';
import type { StepIdField } from './types.ts';

type DispatchConfig = {
	queueName: string;
	where: Prisma.CaseToMigrateWhereInput;
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

async function getCasesToMigrate(
	config: DispatchConfig,
	service: FunctionService,
	dispatchCount: number
): Promise<CaseToMigrate[]> {
	return await service.databaseClient.$transaction(async (transaction) => {
		const selected = await transaction.caseToMigrate.findMany({
			where: config.where,
			take: dispatchCount
		});
		const ids = selected.map((row) => row[config.stepIdField]);
		for (const idsChunk of chunk(ids, service.migrationStepUpdateChunkSize)) {
			await transaction.migrationStep.updateMany({
				where: { id: { in: idsChunk } },
				data: { status: 'queued' }
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

	const cases = await getCasesToMigrate(config, service, dispatchCount);
	if (cases.length === 0) {
		context.log(`[${config.queueName}] No cases to migrate.`);
		return;
	}

	const sender = service.serviceBusClient.createSender(config.queueName);

	try {
		let batch = await sender.createMessageBatch();

		for (const body of cases) {
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
					throw new Error(`Message too large to fit in a batch: ${body.caseReference}`);
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
						in: messages.map((message) => (message.body as CaseToMigrate)[config.stepIdField])
					}
				},
				data: { status: 'waiting' }
			});

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
			queueName: 'data-step',
			where: { DataStep: { status: 'waiting' } },
			stepIdField: 'dataStepId'
		},
		{
			queueName: 'document-list-step',
			where: {
				DataStep: { status: 'complete' },
				DocumentListStep: { status: 'waiting' }
			},
			stepIdField: 'documentListStepId'
		},
		{
			queueName: 'documents-step',
			where: {
				DataStep: { status: 'complete' },
				DocumentListStep: { status: 'complete' },
				DocumentsStep: { status: 'waiting' }
			},
			stepIdField: 'documentsStepId'
		},
		{
			queueName: 'validation-step',
			where: {
				DataStep: { status: 'complete' },
				DocumentListStep: { status: 'complete' },
				DocumentsStep: { status: 'complete' },
				ValidationStep: { status: 'waiting' }
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
