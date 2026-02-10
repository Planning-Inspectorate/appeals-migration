import type { InvocationContext, Timer } from '@azure/functions';
import { app } from '@azure/functions';
import { ServiceBusAdministrationClient, ServiceBusClient } from '@azure/service-bus';
import { newDatabaseClient } from '@pins/appeals-migration-database';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import chunk from 'lodash.chunk';

type DispatchConfig = {
	queueName: string;
	where: object;
	stepIdField: string;
};

async function getDispatchCount(connection: string, queueName: string, context: InvocationContext): Promise<number> {
	const maximumParallelism = Number(process.env.MAXIMUM_PARALLELISM ?? 5);
	const bufferPerWorker = Number(process.env.BUFFER_PER_WORKER ?? 10);
	const properties = await new ServiceBusAdministrationClient(connection).getQueueRuntimeProperties(queueName);
	const activeMessageCount = properties.activeMessageCount;
	context.log(`[${queueName}] Queued: ${activeMessageCount}`);
	return Math.max(0, Math.floor(maximumParallelism * bufferPerWorker) - activeMessageCount);
}

async function getCasesToMigrate(
	config: DispatchConfig,
	databaseConnectionString: string,
	dispatchCount: number
): Promise<CaseToMigrate[]> {
	const prisma = newDatabaseClient(databaseConnectionString);
	try {
		return await prisma.$transaction(async (transaction) => {
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
	} finally {
		await prisma.$disconnect();
	}
}

async function dispatch(
	config: DispatchConfig,
	databaseConnectionString: string,
	busConnectionString: string,
	context: InvocationContext
): Promise<void> {
	let dispatchCount;
	try {
		dispatchCount = await getDispatchCount(busConnectionString, config.queueName, context);
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

	const cases = await getCasesToMigrate(config, databaseConnectionString, dispatchCount);
	if (cases.length === 0) {
		context.log(`[${config.queueName}] No cases to migrate.`);
		return;
	}

	const client = new ServiceBusClient(busConnectionString);
	const sender = client.createSender(config.queueName);

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
		await client.close();
	}
}

async function drain(
	config: DispatchConfig,
	databaseConnectionString: string,
	busConnectionString: string,
	context: InvocationContext
): Promise<void> {
	const client = new ServiceBusClient(busConnectionString);
	const receiver = client.createReceiver(config.queueName, { receiveMode: 'peekLock' });
	const prisma = newDatabaseClient(databaseConnectionString);
	const chunkSize = Number(process.env.MIGRATIONSTEP_UPDATE_CHUNK_SIZE ?? 1000);
	const parallelism = Number(process.env.SERVICE_BUS_PARALLELISM ?? 50);
	let total = 0;

	try {
		while (true) {
			const messages = await receiver.receiveMessages(chunkSize, { maxWaitTimeInMs: 5000 });
			if (messages.length === 0) {
				break;
			}

			await prisma.migrationStep.updateMany({
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
		await prisma.$disconnect();
		await receiver.close();
		await client.close();
	}

	context.log(`[${config.queueName}] Drained: ${total}`);
}

function isEndOfWindow(): boolean {
	const endHour = Number(process.env.END_HOUR!);
	const endMinutes = Number(process.env.END_MINUTES ?? 55);
	const now = new Date();
	return now.getHours() === endHour && now.getMinutes() >= endMinutes;
}

async function run(timer: Timer, context: InvocationContext): Promise<void> {
	const busConnectionString = process.env.SERVICE_BUS_CONNECTION!;
	const databaseConnectionString = process.env.SQL_CONNECTION_STRING;

	if (!busConnectionString) {
		throw new Error('Missing SERVICE_BUS_CONNECTION application setting.');
	}
	if (!databaseConnectionString) {
		throw new Error('Missing SQL_CONNECTION_STRING application setting.');
	}

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
	const action = isEndOfWindow() ? drain : dispatch;
	context.log(`mode: ${action.name}`);
	for (const config of configs) {
		await action(config, databaseConnectionString, busConnectionString, context);
	}
}

function schedule(): string {
	const start = Number(process.env.START_HOUR!);
	const end = Number(process.env.END_HOUR!);
	const cadence = Number(process.env.CADENCE_MINUTES ?? 1);
	const hours = start <= end ? `${start}-${end}` : `0-${end},${start}-23`;
	return `0 */${cadence} ${hours} * * *`;
}

app.timer('migrationDispatcher', {
	schedule: schedule(),
	handler: run
});
