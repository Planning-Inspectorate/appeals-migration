import type { InvocationContext, Timer } from '@azure/functions';
import { app } from '@azure/functions';
import { ServiceBusAdministrationClient, ServiceBusClient } from '@azure/service-bus';
import { newDatabaseClient } from '@pins/appeals-migration-database';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import chunk from 'lodash.chunk';

async function getDispatchCount(connection: string, queueName: string, context: InvocationContext): Promise<number> {
	const maximumParallelism = Number(process.env.MAXIMUM_PARALLELISM ?? 5);
	const bufferPerWorker = Number(process.env.BUFFER_PER_WORKER ?? 10);
	const properties = await new ServiceBusAdministrationClient(connection).getQueueRuntimeProperties(queueName);
	const activeMessageCount = properties.activeMessageCount;
	context.log(`Active message count: ${activeMessageCount}`);
	return Math.max(0, Math.floor(maximumParallelism * bufferPerWorker) - activeMessageCount);
}

async function getCasesToMigrate(databaseConnectionString: string, dispatchCount: number): Promise<CaseToMigrate[]> {
	const prisma = newDatabaseClient(databaseConnectionString);
	try {
		return await prisma.$transaction(async (transaction) => {
			const selected = await transaction.caseToMigrate.findMany({
				where: { DataStep: { inProgress: false, complete: false } },
				take: dispatchCount
			});
			const chunkSize = Number(process.env.MIGRATIONSTEP_UPDATE_CHUNK_SIZE ?? 1000);
			const ids = selected.map((row) => row.dataStepId);
			for (const idsChunk of chunk(ids, chunkSize)) {
				await transaction.migrationStep.updateMany({
					where: { id: { in: idsChunk } },
					data: { inProgress: true }
				});
			}
			return selected;
		});
	} finally {
		await prisma.$disconnect();
	}
}

async function dispatch(
	databaseConnectionString: string,
	busConnectionString: string,
	queueName: string,
	context: InvocationContext
): Promise<void> {
	let dispatchCount;
	try {
		dispatchCount = await getDispatchCount(busConnectionString, queueName, context);
	} catch (error) {
		context.error(`Unable to get count for ${queueName}. The Service Bus connection may need Manage rights.`, error);
		return;
	}

	context.log(`Dispatching ${dispatchCount} jobs.`);
	if (dispatchCount === 0) {
		return;
	}

	const cases = await getCasesToMigrate(databaseConnectionString, dispatchCount);
	if (cases.length === 0) {
		context.log('No cases to migrate.');
		return;
	}

	const client = new ServiceBusClient(busConnectionString);
	const sender = client.createSender(queueName);

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
				context.log(`Dispatched ${batch.count} jobs.`);
				if (!batch.tryAddMessage(message)) {
					throw new Error(`Message too large to fit in a batch: ${body.caseReference}`);
				}
			}
		}

		if (batch.count > 0) {
			await sender.sendMessages(batch);
			context.log(`Dispatched ${batch.count} jobs.`);
		}
	} finally {
		await sender.close();
		await client.close();
	}
}

async function drain(
	databaseConnectionString: string,
	busConnectionString: string,
	queueName: string,
	context: InvocationContext
): Promise<void> {
	const client = new ServiceBusClient(busConnectionString);
	const receiver = client.createReceiver(queueName, { receiveMode: 'peekLock' });
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
				where: { id: { in: messages.map((message) => (message.body as CaseToMigrate).dataStepId) } },
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

	context.log(`Drained ${total} messages from queue.`);
}

function isEndOfWindow(): boolean {
	const endHour = Number(process.env.END_HOUR!);
	const endMinutes = Number(process.env.END_MINUTES ?? 55);
	const now = new Date();
	return now.getHours() === endHour && now.getMinutes() >= endMinutes;
}

async function run(timer: Timer, context: InvocationContext): Promise<void> {
	const busConnectionString = process.env.SERVICE_BUS_CONNECTION!;
	const queueName = process.env.SERVICE_BUS_QUEUE_NAME ?? 'migration-jobs';
	const databaseConnectionString = process.env.SQL_CONNECTION_STRING;

	if (!busConnectionString) {
		throw new Error('Missing SERVICE_BUS_CONNECTION application setting.');
	}
	if (!databaseConnectionString) {
		throw new Error('Missing SQL_CONNECTION_STRING application setting.');
	}

	if (isEndOfWindow()) {
		context.log('End of work window.');
		await drain(databaseConnectionString, busConnectionString, queueName, context);
	} else {
		await dispatch(databaseConnectionString, busConnectionString, queueName, context);
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
