// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { stepStatus } from '../../types.ts';
import { buildDispatcher } from './dispatcher.ts';

describe('buildDispatcher', () => {
	const newContext = () => ({
		log: mock.fn(),
		error: mock.fn()
	});

	const newBatch = () => ({
		count: 0,
		tryAddMessage: mock.fn(() => true)
	});

	const newSender = () => ({
		createMessageBatch: mock.fn(async () => newBatch()),
		sendMessages: mock.fn(),
		close: mock.fn()
	});

	const newReceiver = () => ({
		receiveMessages: mock.fn(async () => []),
		completeMessage: mock.fn(),
		close: mock.fn()
	});

	const newService = ({ activeMessageCount = 0, queueTarget = 10 } = {}) => ({
		serviceBusAdministrationClient: {
			getQueueRuntimeProperties: mock.fn(async () => ({ activeMessageCount }))
		},
		serviceBusClient: {
			createSender: mock.fn(() => newSender()),
			createReceiver: mock.fn(() => newReceiver())
		},
		databaseClient: {
			$transaction: mock.fn(async (callback) =>
				callback({
					caseToMigrate: { findMany: mock.fn(async () => []) },
					migrationStep: { updateMany: mock.fn() }
				})
			),
			migrationStep: { updateMany: mock.fn() }
		},
		dispatcherQueueTarget: queueTarget,
		dispatcherEndWindow: { endHour: -1, endMinutes: 0 },
		migrationStepUpdateChunkSize: 100,
		serviceBusParallelism: 5
	});

	describe('dispatch mode', () => {
		test('returns early when dispatch count is zero', async () => {
			const service = newService({ activeMessageCount: 10, queueTarget: 10 });
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			assert.strictEqual(context.log.mock.calls[0].arguments[0], 'mode: dispatch');
			assert.strictEqual(service.serviceBusClient.createSender.mock.callCount(), 0);
		});

		test('returns early when queue already exceeds target', async () => {
			const service = newService({ activeMessageCount: 20, queueTarget: 5 });
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			assert.strictEqual(service.databaseClient.$transaction.mock.callCount(), 0);
		});

		test('logs and returns when no cases to migrate', async () => {
			const service = newService({ activeMessageCount: 0, queueTarget: 10 });
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			const logged = context.log.mock.calls.map((call) => call.arguments[0]);
			assert.ok(logged.some((message) => message.includes('No cases to migrate')));
		});

		test('dispatches cases in a single batch', async () => {
			const cases = [
				{ caseReference: 'CASE-001', dataStepId: 1 },
				{ caseReference: 'CASE-002', dataStepId: 2 }
			];
			const batch = newBatch();
			const sender = newSender();
			sender.createMessageBatch.mock.mockImplementation(async () => batch);
			batch.count = 2;

			const transaction = {
				caseToMigrate: { findMany: mock.fn(async () => cases) },
				migrationStep: { updateMany: mock.fn() }
			};

			const service = newService({ activeMessageCount: 0, queueTarget: 10 });
			service.databaseClient.$transaction.mock.mockImplementation(async (callback) => callback(transaction));
			service.serviceBusClient.createSender.mock.mockImplementation(() => sender);
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			assert.strictEqual(sender.sendMessages.mock.callCount(), 4);
			assert.strictEqual(sender.close.mock.callCount(), 4);
			assert.strictEqual(batch.tryAddMessage.mock.callCount(), 8);
		});

		test('marks migration steps as in progress during transaction', async () => {
			const cases = [{ caseReference: 'CASE-001', dataStepId: 10 }];
			const batch = newBatch();
			batch.count = 1;
			const sender = newSender();
			sender.createMessageBatch.mock.mockImplementation(async () => batch);

			const transaction = {
				caseToMigrate: { findMany: mock.fn(async () => cases) },
				migrationStep: { updateMany: mock.fn() }
			};

			const service = newService({ activeMessageCount: 0, queueTarget: 5 });
			service.databaseClient.$transaction.mock.mockImplementation(async (callback) => callback(transaction));
			service.serviceBusClient.createSender.mock.mockImplementation(() => sender);
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			assert.strictEqual(transaction.migrationStep.updateMany.mock.callCount(), 4);
			assert.deepStrictEqual(transaction.migrationStep.updateMany.mock.calls[0].arguments[0], {
				where: { id: { in: [10] } },
				data: { status: stepStatus.queued }
			});
		});

		test('sends additional batch when message does not fit', async () => {
			const cases = [
				{ caseReference: 'CASE-001', dataStepId: 1 },
				{ caseReference: 'CASE-002', dataStepId: 2 }
			];

			let firstBatchFull = false;
			const firstBatch = {
				count: 1,
				tryAddMessage: mock.fn(() => {
					if (firstBatchFull) {
						return false;
					}
					firstBatchFull = true;
					return true;
				})
			};
			const secondBatch = {
				count: 1,
				tryAddMessage: mock.fn(() => true)
			};

			let batchCall = 0;
			const sender = newSender();
			sender.createMessageBatch.mock.mockImplementation(async () => {
				batchCall++;
				return batchCall === 1 ? firstBatch : secondBatch;
			});

			const transaction = {
				caseToMigrate: { findMany: mock.fn(async () => cases) },
				migrationStep: { updateMany: mock.fn() }
			};

			const service = newService({ activeMessageCount: 0, queueTarget: 10 });
			service.databaseClient.$transaction.mock.mockImplementation(async (callback) => callback(transaction));
			service.serviceBusClient.createSender.mock.mockImplementation(() => sender);
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			assert.ok(sender.sendMessages.mock.callCount() >= 2);
		});

		test('throws when message is too large for any batch', async () => {
			const cases = [{ caseReference: 'LARGE-001', dataStepId: 1 }];

			const batch = {
				count: 0,
				tryAddMessage: mock.fn(() => false)
			};
			const sender = newSender();
			sender.createMessageBatch.mock.mockImplementation(async () => batch);

			const transaction = {
				caseToMigrate: { findMany: mock.fn(async () => cases) },
				migrationStep: { updateMany: mock.fn() }
			};

			const service = newService({ activeMessageCount: 0, queueTarget: 10 });
			service.databaseClient.$transaction.mock.mockImplementation(async (callback) => callback(transaction));
			service.serviceBusClient.createSender.mock.mockImplementation(() => sender);
			const context = newContext();

			const handler = buildDispatcher(service);

			await assert.rejects(
				() => handler({}, context),
				(error) => {
					assert.ok(error.message.includes('LARGE-001'));
					return true;
				}
			);
			assert.strictEqual(sender.close.mock.callCount(), 1);
		});

		test('closes sender even when error occurs', async () => {
			const cases = [{ caseReference: 'ERR-001', dataStepId: 1 }];

			const batch = {
				count: 0,
				tryAddMessage: mock.fn(() => false)
			};
			const sender = newSender();
			sender.createMessageBatch.mock.mockImplementation(async () => batch);

			const transaction = {
				caseToMigrate: { findMany: mock.fn(async () => cases) },
				migrationStep: { updateMany: mock.fn() }
			};

			const service = newService({ activeMessageCount: 0, queueTarget: 10 });
			service.databaseClient.$transaction.mock.mockImplementation(async (callback) => callback(transaction));
			service.serviceBusClient.createSender.mock.mockImplementation(() => sender);
			const context = newContext();

			const handler = buildDispatcher(service);

			await assert.rejects(() => handler({}, context));
			assert.ok(sender.close.mock.callCount() >= 1);
		});

		test('dispatches to all four queue configs', async () => {
			const service = newService({ activeMessageCount: 0, queueTarget: 5 });
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			assert.strictEqual(service.serviceBusAdministrationClient.getQueueRuntimeProperties.mock.callCount(), 4);

			const queues = service.serviceBusAdministrationClient.getQueueRuntimeProperties.mock.calls.map(
				(call) => call.arguments[0]
			);
			assert.deepStrictEqual(queues, ['data-step', 'document-list-step', 'documents-step', 'validation-step']);
		});

		test('chunks migration step updates for large batches', async () => {
			const cases = Array.from({ length: 3 }, (_, index) => ({
				caseReference: `CASE-${index}`,
				dataStepId: index + 1
			}));

			const batch = newBatch();
			batch.count = 3;
			const sender = newSender();
			sender.createMessageBatch.mock.mockImplementation(async () => batch);

			const transaction = {
				caseToMigrate: { findMany: mock.fn(async () => cases) },
				migrationStep: { updateMany: mock.fn() }
			};

			const service = newService({ activeMessageCount: 0, queueTarget: 10 });
			service.migrationStepUpdateChunkSize = 2;
			service.databaseClient.$transaction.mock.mockImplementation(async (callback) => callback(transaction));
			service.serviceBusClient.createSender.mock.mockImplementation(() => sender);
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			assert.strictEqual(transaction.migrationStep.updateMany.mock.callCount(), 8);
			assert.deepStrictEqual(transaction.migrationStep.updateMany.mock.calls[0].arguments[0].where.id.in, [1, 2]);
			assert.deepStrictEqual(transaction.migrationStep.updateMany.mock.calls[1].arguments[0].where.id.in, [3]);
		});
	});

	describe('drain mode', () => {
		const newDrainService = () => {
			const service = newService();
			const now = new Date();
			service.dispatcherEndWindow = { endHour: now.getHours(), endMinutes: now.getMinutes() };
			return service;
		};

		test('drains messages and updates database', async () => {
			const messages = [
				{ body: { caseReference: 'CASE-001', dataStepId: 5 } },
				{ body: { caseReference: 'CASE-002', dataStepId: 6 } }
			];

			const receiver = newReceiver();
			let called = false;
			receiver.receiveMessages.mock.mockImplementation(async () => {
				if (called) {
					return [];
				}
				called = true;
				return messages;
			});

			const service = newDrainService();
			service.serviceBusClient.createReceiver.mock.mockImplementation(() => receiver);
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			assert.strictEqual(context.log.mock.calls[0].arguments[0], 'mode: drain');
			assert.strictEqual(service.databaseClient.migrationStep.updateMany.mock.callCount(), 1);
			assert.strictEqual(
				service.databaseClient.migrationStep.updateMany.mock.calls[0].arguments[0].data.status,
				stepStatus.waiting
			);
			assert.strictEqual(receiver.completeMessage.mock.callCount(), 2);
			assert.strictEqual(receiver.close.mock.callCount(), 4);
		});

		test('handles empty queue with zero drained', async () => {
			const service = newDrainService();
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			const logged = context.log.mock.calls.map((call) => call.arguments[0]);
			assert.ok(logged.some((message) => message.includes('Drained: 0')));
		});

		test('closes receiver even on error', async () => {
			const receiver = newReceiver();
			receiver.receiveMessages.mock.mockImplementation(async () => {
				throw new Error('receive failed');
			});

			const service = newDrainService();
			service.serviceBusClient.createReceiver.mock.mockImplementation(() => receiver);
			const context = newContext();

			const handler = buildDispatcher(service);

			await assert.rejects(() => handler({}, context));
			assert.ok(receiver.close.mock.callCount() >= 1);
		});

		test('completes messages in parallel chunks', async () => {
			const messages = Array.from({ length: 5 }, (_, index) => ({
				body: { caseReference: `CASE-${index}`, dataStepId: index }
			}));

			const receiver = newReceiver();
			let called = false;
			receiver.receiveMessages.mock.mockImplementation(async () => {
				if (called) {
					return [];
				}
				called = true;
				return messages;
			});

			const service = newDrainService();
			service.serviceBusParallelism = 2;
			service.serviceBusClient.createReceiver.mock.mockImplementation(() => receiver);
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			assert.strictEqual(receiver.completeMessage.mock.callCount(), 5);
		});

		test('drains multiple rounds of messages', async () => {
			const round1 = [{ body: { caseReference: 'CASE-A', dataStepId: 1 } }];
			const round2 = [{ body: { caseReference: 'CASE-B', dataStepId: 2 } }];

			const receiver = newReceiver();
			let round = 0;
			receiver.receiveMessages.mock.mockImplementation(async () => {
				round++;
				if (round === 1) return round1;
				if (round === 2) return round2;
				return [];
			});

			const service = newDrainService();
			service.serviceBusClient.createReceiver.mock.mockImplementation(() => receiver);
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			const logged = context.log.mock.calls.map((call) => call.arguments[0]);
			assert.ok(logged.some((message) => message.includes('Drained: 2')));
		});

		test('creates receiver with peekLock mode', async () => {
			const service = newDrainService();
			const context = newContext();

			const handler = buildDispatcher(service);
			await handler({}, context);

			const receiverCalls = service.serviceBusClient.createReceiver.mock.calls;
			assert.strictEqual(receiverCalls.length, 4);
			assert.deepStrictEqual(receiverCalls[0].arguments[1], { receiveMode: 'peekLock' });
		});
	});
});
