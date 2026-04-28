import type { ManageService } from '#service';
import type { ServiceBusSender } from '@azure/service-bus';
import type { AsyncRequestHandler } from '@pins/appeals-migration-lib/util/async-handler.ts';
import { ACTION_TO_QUEUE_NAME, MIGRATION_ACTIONS } from './actions.ts';

export function buildActionController(service: ManageService): AsyncRequestHandler {
	const { db, logger, serviceBusClient } = service;
	return async (req, res) => {
		const { caseReference, migrationAction } = req.params;
		logger.info({ caseReference, migrationAction }, 'migration action');

		if (!caseReference || typeof caseReference !== 'string') {
			return res.redirect('/cases');
		}

		const backToCasePage = () => res.redirect(`/case/${caseReference}`);

		if (!migrationAction || typeof migrationAction !== 'string') {
			return backToCasePage();
		}

		if (!Object.values(MIGRATION_ACTIONS).includes(migrationAction as any)) {
			return backToCasePage();
		}

		const caseToMigrate = await db.caseToMigrate.findUnique({
			where: { caseReference },
			select: {
				caseReference: true,
				dataStepId: true,
				documentListStepId: true,
				documentsStepId: true,
				validationStepId: true
			}
		});

		if (!caseToMigrate) {
			return backToCasePage();
		}
		let sender: ServiceBusSender | undefined;

		try {
			if (migrationAction === MIGRATION_ACTIONS.DOCUMENTS) {
				const documentsToMigrate = await db.documentToMigrate.findMany({
					where: { caseReference }
				});
				if (documentsToMigrate.length > 0) {
					const queue = 'appeals-migration-migrate-documents';
					sender = serviceBusClient.createSender(queue);
					logger.info({ documentsToMigrateCount: documentsToMigrate.length, queue }, 'sending messages to queue');
					let batch = await sender.createMessageBatch();

					for (const body of documentsToMigrate) {
						const message = {
							body,
							contentType: 'application/json',
							subject: 'migration-job'
						};

						if (!batch.tryAddMessage(message)) {
							await sender.sendMessages(batch);
							const sentCount = batch.count;
							batch = await sender.createMessageBatch();
							logger.info({ queue, count: sentCount }, `sent batch of messages`);
							if (!batch.tryAddMessage(message)) {
								throw new Error(`Message too large to fit in a batch: ${JSON.stringify(body)}`);
							}
						}
					}

					if (batch.count > 0) {
						await sender.sendMessages(batch);
						logger.info({ queue, count: batch.count }, `sent final batch of messages`);
					}
				} else {
					logger.info('no documents to migrate');
				}
			} else {
				const queue = ACTION_TO_QUEUE_NAME.get(migrationAction as any);
				if (!queue) {
					throw new Error('unsupported action name');
				}
				sender = serviceBusClient.createSender(queue);
				logger.info({ caseToMigrate, queue }, 'sending message to queue');
				await sender.sendMessages({
					body: caseToMigrate,
					contentType: 'application/json',
					subject: 'migration-job'
				});
			}
			logger.info('messages sent');
		} finally {
			await sender?.close();
		}

		// todo: success banner

		return backToCasePage();
	};
}
