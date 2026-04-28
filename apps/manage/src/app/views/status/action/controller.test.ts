// @ts-nocheck
import { strict as assert } from 'node:assert';
import { describe, mock, test } from 'node:test';
import { MIGRATION_ACTIONS } from './actions.ts';
import { buildActionController } from './controller.ts';

function buildMockService({ caseToMigrate = null, documentsToMigrate = [] } = {}) {
	const sendMessages = mock.fn(async () => {});
	const createSender = mock.fn(() => ({
		sendMessages,
		createMessageBatch: () => {
			const messages = [];
			return {
				get count() {
					return messages.length;
				},
				get messages() {
					return messages;
				},
				tryAddMessage: mock.fn((msg) => {
					messages.push(msg);
					return true;
				})
			};
		},
		close: mock.fn()
	}));
	return {
		service: {
			db: {
				caseToMigrate: {
					findUnique: mock.fn(async () => caseToMigrate)
				},
				documentToMigrate: {
					findMany: mock.fn(async () => documentsToMigrate)
				}
			},
			logger: {
				info: mock.fn()
			},
			serviceBusClient: {
				createSender
			}
		},
		mocks: { sendMessages, createSender }
	};
}

function buildReqRes(caseReference, migrationAction) {
	const redirect = mock.fn();
	return {
		req: { params: { caseReference, migrationAction } },
		res: { redirect }
	};
}

describe('buildActionController', () => {
	test('redirects when caseReference is missing', async () => {
		const { service, mocks } = buildMockService();
		const handler = buildActionController(service);
		const { req, res } = buildReqRes(undefined, 'data');
		await handler(req, res);
		assert.strictEqual(res.redirect.mock.callCount(), 1);
		assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['/cases']);
		assert.strictEqual(mocks.sendMessages.mock.callCount(), 0);
	});

	test('redirects when migrationAction is missing', async () => {
		const { service, mocks } = buildMockService();
		const handler = buildActionController(service);
		const { req, res } = buildReqRes('1234', undefined);
		await handler(req, res);
		assert.strictEqual(res.redirect.mock.callCount(), 1);
		assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['/case/1234']);
		assert.strictEqual(mocks.sendMessages.mock.callCount(), 0);
	});

	test('redirects when migrationAction is not a valid action', async () => {
		const { service, mocks } = buildMockService();
		const handler = buildActionController(service);
		const { req, res } = buildReqRes('1234', 'invalid-action');
		await handler(req, res);
		assert.strictEqual(res.redirect.mock.callCount(), 1);
		assert.deepStrictEqual(res.redirect.mock.calls[0].arguments, ['/case/1234']);
		assert.strictEqual(mocks.sendMessages.mock.callCount(), 0);
	});

	test('redirects when case is not found in database', async () => {
		const { service, mocks } = buildMockService({ caseToMigrate: null });
		const handler = buildActionController(service);
		const { req, res } = buildReqRes('1234', MIGRATION_ACTIONS.DATA);
		await handler(req, res);
		assert.strictEqual(res.redirect.mock.callCount(), 1);
		assert.strictEqual(service.db.caseToMigrate.findUnique.mock.callCount(), 1);
		assert.strictEqual(mocks.sendMessages.mock.callCount(), 0);
	});

	test('sends case to queue for DATA action', async () => {
		const caseToMigrate = { caseReference: '1234', type: 'appeal' };
		const { service, mocks } = buildMockService({ caseToMigrate });
		const handler = buildActionController(service);
		const { req, res } = buildReqRes('1234', MIGRATION_ACTIONS.DATA);
		await handler(req, res);

		assert.strictEqual(mocks.createSender.mock.callCount(), 1);
		assert.deepStrictEqual(mocks.createSender.mock.calls[0].arguments, ['appeals-migration-migrate-data']);
		assert.strictEqual(mocks.sendMessages.mock.callCount(), 1);
		const sentMessage = mocks.sendMessages.mock.calls[0].arguments[0];
		assert.deepStrictEqual(sentMessage.body, caseToMigrate);
		assert.strictEqual(sentMessage.contentType, 'application/json');
		assert.strictEqual(sentMessage.subject, 'migration-job');
		assert.strictEqual(res.redirect.mock.callCount(), 1);
	});

	test('sends case to queue for VALIDATE action', async () => {
		const caseToMigrate = { caseReference: '1234' };
		const { service, mocks } = buildMockService({ caseToMigrate });
		const handler = buildActionController(service);
		const { req, res } = buildReqRes('1234', MIGRATION_ACTIONS.VALIDATE);
		await handler(req, res);

		assert.deepStrictEqual(mocks.createSender.mock.calls[0].arguments, ['appeals-migration-validate-migrated-cases']);
		assert.strictEqual(res.redirect.mock.callCount(), 1);
	});

	test('sends case to queue for LIST_DOCUMENTS action', async () => {
		const caseToMigrate = { caseReference: '1234' };
		const { service, mocks } = buildMockService({ caseToMigrate });
		const handler = buildActionController(service);
		const { req, res } = buildReqRes('1234', MIGRATION_ACTIONS.LIST_DOCUMENTS);
		await handler(req, res);

		assert.deepStrictEqual(mocks.createSender.mock.calls[0].arguments, ['appeals-migration-list-documents-to-migrate']);
	});

	test('sends individual document messages for DOCUMENTS action', async () => {
		const caseToMigrate = { caseReference: '1234' };
		const documentsToMigrate = [
			{ id: 1, caseReference: '1234', name: 'doc1.pdf' },
			{ id: 2, caseReference: '1234', name: 'doc2.pdf' }
		];
		const { service, mocks } = buildMockService({ caseToMigrate, documentsToMigrate });
		const handler = buildActionController(service);
		const { req, res } = buildReqRes('1234', MIGRATION_ACTIONS.DOCUMENTS);
		await handler(req, res);

		assert.deepStrictEqual(mocks.createSender.mock.calls[0].arguments, ['appeals-migration-migrate-documents']);
		assert.strictEqual(mocks.sendMessages.mock.callCount(), 1);
		const batch = mocks.sendMessages.mock.calls[0].arguments[0];
		assert.strictEqual(batch.count, 2);
		assert.deepStrictEqual(batch.messages[0].body, documentsToMigrate[0]);
		assert.deepStrictEqual(batch.messages[1].body, documentsToMigrate[1]);
		assert.strictEqual(batch.messages[0].contentType, 'application/json');
		assert.strictEqual(batch.messages[0].subject, 'migration-job');
		assert.strictEqual(res.redirect.mock.callCount(), 1);
	});

	test(`doesn't send empty array for DOCUMENTS action with no documents`, async () => {
		const caseToMigrate = { caseReference: '1234' };
		const { service, mocks } = buildMockService({ caseToMigrate, documentsToMigrate: [] });
		const handler = buildActionController(service);
		const { req, res } = buildReqRes('1234', MIGRATION_ACTIONS.DOCUMENTS);
		await handler(req, res);

		assert.strictEqual(mocks.sendMessages.mock.callCount(), 0);
	});
});
