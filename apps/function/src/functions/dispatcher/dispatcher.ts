import type { InvocationContext, Timer, TimerHandler } from '@azure/functions';
import type { Prisma } from '@pins/appeals-migration-database/src/client/client.ts';
import { withRetry } from '@pins/appeals-migration-lib/util/retry.ts';
import chunk from 'lodash.chunk';
import type { FunctionService } from '../../service.ts';
import type { StepIdField } from '../../types.ts';
import { stepStatus, type ItemToMigrate } from '../../types.ts';
import { getStepId } from '../shared/step-id.ts';
import { determineAction, parseTime, type ScheduleWindow } from './schedule-date.ts';

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
	return withRetry(() =>
		service.databaseClient.$transaction(async (transaction) => {
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
		})
	);
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

			await withRetry(() =>
				databaseClient.migrationStep.updateMany({
					where: {
						id: {
							in: messages.map((message) => getStepId(message.body as ItemToMigrate, config.stepIdField))
						}
					},
					data: { status: stepStatus.waiting }
				})
			);

			if (config.queueName === 'documents-step') {
				const caseReferences = [...new Set(messages.map((message) => (message.body as ItemToMigrate).caseReference))];
				const cases = await withRetry(() =>
					databaseClient.caseToMigrate.findMany({
						where: { caseReference: { in: caseReferences } },
						select: { documentsStepId: true }
					})
				);

				const ids = cases.map((caseToMigrate) => caseToMigrate.documentsStepId);
				for (const idsChunk of chunk(ids, service.migrationStepUpdateChunkSize)) {
					await withRetry(() =>
						databaseClient.migrationStep.updateMany({
							where: {
								id: { in: idsChunk },
								status: stepStatus.processing
							},
							data: { status: stepStatus.waiting }
						})
					);
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

/**
 * Load schedule windows from the database
 */
async function loadSchedules(service: FunctionService): Promise<ScheduleWindow[]> {
	const rows = await service.databaseClient.migrationSchedule.findMany({
		orderBy: [{ startDayIndex: 'asc' }, { startTime: 'asc' }, { endDayIndex: 'asc' }, { endTime: 'asc' }]
	});
	return rows.map((row) => ({
		startDay: row.startDayIndex,
		startMinutes: parseTime(row.startTime),
		endDay: row.endDayIndex,
		endMinutes: parseTime(row.endTime)
	}));
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

	return async (_timer: Timer, context: InvocationContext): Promise<void> => {
		const schedules = await loadSchedules(service);

		if (schedules.length === 0) {
			context.log('No migration schedules configured, skipping.');
			return;
		}

		const action = determineAction(new Date(), schedules);
		context.log(`mode: ${action}`);

		if (action === 'skip') {
			context.log('Outside schedule window, skipping.');
			return;
		}

		const handler = action === 'drain' ? drain : dispatch;
		for (const config of configs) {
			await handler(config, service, context);
		}
	};
}
