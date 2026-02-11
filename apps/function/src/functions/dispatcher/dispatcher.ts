import type { InvocationContext, Timer, TimerHandler } from '@azure/functions';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import chunk from 'lodash.chunk';
import type { FunctionService } from '../../service.ts';

type DispatchConfig = {
	queueName: string;
	where: object;
	stepIdField: string;
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
		const chunkSize = Number(process.env.MIGRATIONSTEP_UPDATE_CHUNK_SIZE ?? 1000);
		const ids = selected.map((row) => (row as Record<string, unknown>)[config.stepIdField] as number);
		for (const idsChunk of chunk(ids, chunkSize)) {
			await transaction.migrationStep.updateMany({
				where: { id: { in: idsChunk } },
				data: {
					inProgress: true
					// TODO set status to in-progress when implemented
					// TODO set startTimestamp when implemented
					// TODO set workerId when implemented
				}
			});
		}
		return selected;
	});
}

async function dispatch(config: DispatchConfig, service: FunctionService, context: InvocationContext): Promise<void> {
	let dispatchCount;
	try {
		dispatchCount = await getDispatchCount(service, config.queueName, context);
	} catch (error) {
		context.error(
			`Unable to get count for ${config.queueName}. The Service Bus connection may need Manage rights.`,
			error
		);
		return;
	}

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
			context.log(`[${config.queueName}] Dispatched ${batch.count} jobs.`);
		}
	} finally {
		await sender.close();
	}
}

async function drain(config: DispatchConfig, service: FunctionService, context: InvocationContext): Promise<void> {
	const databaseClient = service.databaseClient;
	const receiver = service.serviceBusClient.createReceiver(config.queueName, { receiveMode: 'peekLock' });
	const chunkSize = Number(process.env.MIGRATIONSTEP_UPDATE_CHUNK_SIZE ?? 1000);
	const parallelism = Number(process.env.SERVICE_BUS_PARALLELISM ?? 50);
	let total = 0;

	try {
		while (true) {
			const messages = await receiver.receiveMessages(chunkSize, { maxWaitTimeInMs: 5000 });
			if (messages.length === 0) {
				break;
			}

			await databaseClient.migrationStep.updateMany({
				where: {
					id: {
						in: messages.map((message) => (message.body as Record<string, unknown>)[config.stepIdField] as number)
					}
				},
				data: { inProgress: false }
			});

			for (const messagesChunk of chunk(messages, parallelism)) {
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
			where: { DataStep: { inProgress: false, complete: false } },
			stepIdField: 'dataStepId'
		},
		{
			queueName: 'document-list-step',
			where: { DocumentListStep: { inProgress: false, complete: false } },
			stepIdField: 'documentListStepId'
		},
		{
			queueName: 'documents-step',
			where: { DocumentListStep: { complete: true }, DocumentsStep: { inProgress: false, complete: false } },
			stepIdField: 'documentsStepId'
		},
		{
			queueName: 'validation-step',
			where: {
				DataStep: { complete: true },
				DocumentsStep: { complete: true },
				ValidationStep: { inProgress: false, complete: false }
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
