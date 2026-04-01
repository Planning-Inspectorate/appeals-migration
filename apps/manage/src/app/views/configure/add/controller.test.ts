// @ts-nocheck
import { mockLogger } from '@pins/appeals-migration-lib/testing/mock-logger.ts';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { buildAddParameter } from './controller.ts';

describe('add/controller', () => {
	describe('post', () => {
		it('should create a parameter and redirect to /configure', async () => {
			const created = { id: 1 };
			const mockDb = {
				toMigrateParameter: {
					create: mock.fn(() => created)
				}
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockReq = {
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

			const { post } = buildAddParameter({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			assert.strictEqual(mockDb.toMigrateParameter.create.mock.callCount(), 1);
			const createArg = mockDb.toMigrateParameter.create.mock.calls[0].arguments[0];
			assert.strictEqual(createArg.data.caseTypeName, 'appeal-s78');
			assert.strictEqual(createArg.data.lpa, 'Q9999');
			assert.strictEqual(createArg.data.procedureType, 'written');
			assert.strictEqual(createArg.data.status, 'closed');
			assert.deepStrictEqual(createArg.data.dateReceivedFrom, new Date('2025-01-01T00:00:00.000Z'));
			assert.deepStrictEqual(createArg.data.dateReceivedTo, new Date('2025-06-30T00:00:00.000Z'));
			assert.strictEqual(createArg.data.decisionDateFrom, null);
			assert.strictEqual(createArg.data.decisionDateTo, null);
			assert.strictEqual(createArg.data.startDateFrom, null);
			assert.strictEqual(createArg.data.startDateTo, null);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/configure');
		});

		it('should pass null for empty string fields', async () => {
			const created = { id: 2 };
			const mockDb = {
				toMigrateParameter: {
					create: mock.fn(() => created)
				}
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockReq = {
				body: {
					caseTypeName: '',
					lpa: '',
					procedureType: '',
					status: '',
					dateReceivedFrom: '',
					dateReceivedTo: '',
					decisionDateFrom: '',
					decisionDateTo: '',
					startDateFrom: '',
					startDateTo: ''
				}
			};

			const { post } = buildAddParameter({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			const createArg = mockDb.toMigrateParameter.create.mock.calls[0].arguments[0];
			assert.strictEqual(createArg.data.caseTypeName, null);
			assert.strictEqual(createArg.data.lpa, null);
			assert.strictEqual(createArg.data.procedureType, null);
			assert.strictEqual(createArg.data.status, null);
			assert.strictEqual(createArg.data.dateReceivedFrom, null);
			assert.strictEqual(createArg.data.dateReceivedTo, null);

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
		});

		it('should trim whitespace from string fields', async () => {
			const created = { id: 3 };
			const mockDb = {
				toMigrateParameter: {
					create: mock.fn(() => created)
				}
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockReq = {
				body: {
					caseTypeName: '  appeal-s78  ',
					lpa: '  Q9999  ',
					procedureType: '  written  ',
					status: '  closed  ',
					dateReceivedFrom: '',
					dateReceivedTo: '',
					decisionDateFrom: '',
					decisionDateTo: '',
					startDateFrom: '',
					startDateTo: ''
				}
			};

			const { post } = buildAddParameter({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			const createArg = mockDb.toMigrateParameter.create.mock.calls[0].arguments[0];
			assert.strictEqual(createArg.data.caseTypeName, 'appeal-s78');
			assert.strictEqual(createArg.data.lpa, 'Q9999');
			assert.strictEqual(createArg.data.procedureType, 'written');
			assert.strictEqual(createArg.data.status, 'closed');
		});
	});
});
