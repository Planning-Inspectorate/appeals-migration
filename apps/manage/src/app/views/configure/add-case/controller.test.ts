// @ts-nocheck
import { mockLogger } from '@pins/appeals-migration-lib/testing/mock-logger.ts';
import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { buildAddCase } from './controller.ts';

describe('add-case/controller', () => {
	describe('post', () => {
		it('should create a case and redirect to /configure', async () => {
			const body = { caseReference: 'REF-001' };
			const mockDb = {
				caseToMigrate: {
					createWithDefaults: mock.fn(() => body)
				}
			};
			const mockSourceDb = {
				appealHas: {
					findFirst: mock.fn(() => ({ caseId: 42 }))
				},
				appealS78: {
					findFirst: mock.fn(() => null)
				}
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockReq = { body, session: {} };

			const { post } = buildAddCase({ db: mockDb, logger: mockLogger(), sourceDb: mockSourceDb });
			await post(mockReq, mockRes);

			assert.strictEqual(mockDb.caseToMigrate.createWithDefaults.mock.callCount(), 1);
			const createArgs = mockDb.caseToMigrate.createWithDefaults.mock.calls[0].arguments;
			assert.strictEqual(createArgs[0], body.caseReference);
			assert.strictEqual(createArgs[1], '42');

			assert.strictEqual(mockRes.redirect.mock.callCount(), 1);
			assert.strictEqual(mockRes.redirect.mock.calls[0].arguments[0], '/configure');
			assert.strictEqual(mockReq.session.addCaseSuccess, 'REF-001');
		});

		it('should trim whitespace from string fields', async () => {
			const body = { caseReference: '  REF-001 ' };
			const mockDb = {
				caseToMigrate: {
					createWithDefaults: mock.fn(() => body)
				}
			};
			const mockSourceDb = {
				appealHas: {
					findFirst: mock.fn(() => ({ caseId: 99 }))
				},
				appealS78: {
					findFirst: mock.fn(() => null)
				}
			};
			const mockRes = {
				redirect: mock.fn()
			};
			const mockReq = { body, session: {} };

			const { post } = buildAddCase({ db: mockDb, logger: mockLogger(), sourceDb: mockSourceDb });
			await post(mockReq, mockRes);

			assert.strictEqual(mockDb.caseToMigrate.createWithDefaults.mock.callCount(), 1);
			const createArgs = mockDb.caseToMigrate.createWithDefaults.mock.calls[0].arguments;
			assert.strictEqual(createArgs[0], 'REF-001');
			assert.strictEqual(createArgs[1], '99');
			assert.strictEqual(mockReq.session.addCaseSuccess, 'REF-001');
		});

		it('should render error when case not found in source', async () => {
			const body = { caseReference: 'NOT-FOUND' };
			const mockDb = {
				caseToMigrate: {
					createWithDefaults: mock.fn()
				}
			};
			const mockSourceDb = {
				appealHas: {
					findFirst: mock.fn(() => null)
				},
				appealS78: {
					findFirst: mock.fn(() => null)
				}
			};
			const mockRes = {
				redirect: mock.fn(),
				render: mock.fn()
			};
			const mockReq = { body, session: {} };

			const { post } = buildAddCase({ db: mockDb, logger: mockLogger(), sourceDb: mockSourceDb });
			await post(mockReq, mockRes);

			assert.strictEqual(mockDb.caseToMigrate.createWithDefaults.mock.callCount(), 0);
			assert.strictEqual(mockRes.render.mock.callCount(), 1);
			assert.strictEqual(
				mockRes.render.mock.calls[0].arguments[1].errorMessage,
				'Case NOT-FOUND not found in source database'
			);
		});
	});
});
