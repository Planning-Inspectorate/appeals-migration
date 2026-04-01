// @ts-nocheck
import { mockLogger } from '@pins/appeals-migration-lib/testing/mock-logger.ts';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { buildEditParameter } from './controller.ts';

describe('edit/controller', () => {
	describe('post', () => {
		it('should update a parameter and redirect to /configure', async () => {
			const existing = {
				id: 5,
				caseTypeName: 'old',
				lpa: null,
				procedureType: null,
				status: null,
				dateReceivedFrom: null,
				dateReceivedTo: null,
				decisionDateFrom: null,
				decisionDateTo: null,
				startDateFrom: null,
				startDateTo: null
			};
			const mockDb = {
				toMigrateParameter: {
					findUnique: mock.fn(() => existing),
					update: mock.fn()
				}
			};
			const mockRes = {
				status: mock.fn(() => mockRes),
				render: mock.fn(),
				redirect: mock.fn()
			};
			const mockReq = {
				params: { id: '5' },
				body: {
					caseTypeName: 'appeal-s78',
					lpa: 'Q9999',
					procedureType: 'written',
					status: 'closed',
					dateReceivedFrom: '2025-01-01',
					dateReceivedTo: '2025-06-30',
					decisionDateFrom: '',
					decisionDateTo: '',
					startDateFrom: '',
					startDateTo: ''
				}
			};

			const { post } = buildEditParameter({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			assert.strictEqual(mockDb.toMigrateParameter.findUnique.mock.callCount(), 1);
			assert.deepStrictEqual(mockDb.toMigrateParameter.findUnique.mock.calls[0].arguments[0], { where: { id: 5 } });

			assert.strictEqual(mockDb.toMigrateParameter.update.mock.callCount(), 1);
			const updateArg = mockDb.toMigrateParameter.update.mock.calls[0].arguments[0];
			assert.deepStrictEqual(updateArg.where, { id: 5 });
			assert.strictEqual(updateArg.data.caseTypeName, 'appeal-s78');
			assert.strictEqual(updateArg.data.lpa, 'Q9999');
			assert.strictEqual(updateArg.data.procedureType, 'written');
			assert.strictEqual(updateArg.data.status, 'closed');
			assert.deepStrictEqual(updateArg.data.dateReceivedFrom, new Date('2025-01-01T00:00:00.000Z'));
			assert.deepStrictEqual(updateArg.data.dateReceivedTo, new Date('2025-06-30T00:00:00.000Z'));
			assert.strictEqual(updateArg.data.decisionDateFrom, null);
			assert.strictEqual(updateArg.data.startDateFrom, null);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/configure');
		});

		it('should return 400 for a non-numeric id', async () => {
			const mockDb = {
				toMigrateParameter: {
					findUnique: mock.fn(),
					update: mock.fn()
				}
			};
			const mockRes = {
				status: mock.fn(() => mockRes),
				render: mock.fn()
			};
			const mockReq = {
				params: { id: 'abc' },
				body: {}
			};

			const { post } = buildEditParameter({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 400);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/errors/404.njk');
			assert.strictEqual(mockDb.toMigrateParameter.findUnique.mock.callCount(), 0);
			assert.strictEqual(mockDb.toMigrateParameter.update.mock.callCount(), 0);
		});

		it('should return 400 for a decimal id', async () => {
			const mockDb = {
				toMigrateParameter: {
					findUnique: mock.fn(),
					update: mock.fn()
				}
			};
			const mockRes = {
				status: mock.fn(() => mockRes),
				render: mock.fn()
			};
			const mockReq = {
				params: { id: '1.5' },
				body: {}
			};

			const { post } = buildEditParameter({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 400);
			assert.strictEqual(mockDb.toMigrateParameter.update.mock.callCount(), 0);
		});

		it('should return 400 for an array id', async () => {
			const mockDb = {
				toMigrateParameter: {
					findUnique: mock.fn(),
					update: mock.fn()
				}
			};
			const mockRes = {
				status: mock.fn(() => mockRes),
				render: mock.fn()
			};
			const mockReq = {
				params: { id: ['1', '2'] },
				body: {}
			};

			const { post } = buildEditParameter({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 400);
			assert.strictEqual(mockDb.toMigrateParameter.update.mock.callCount(), 0);
		});

		it('should return 404 when parameter does not exist', async () => {
			const mockDb = {
				toMigrateParameter: {
					findUnique: mock.fn(() => null),
					update: mock.fn()
				}
			};
			const mockRes = {
				status: mock.fn(() => mockRes),
				render: mock.fn()
			};
			const mockReq = {
				params: { id: '99' },
				body: {}
			};

			const { post } = buildEditParameter({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			assert.strictEqual(mockDb.toMigrateParameter.findUnique.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.callCount(), 1);
			assert.strictEqual(mockRes.status.mock.calls[0].arguments[0], 404);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(mockRes.render.mock.calls[0].arguments[0], 'views/errors/404.njk');
			assert.strictEqual(mockDb.toMigrateParameter.update.mock.callCount(), 0);
		});
	});
});
