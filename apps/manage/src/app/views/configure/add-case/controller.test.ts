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
			const mockRes = {
				redirect: mock.fn()
			};
			const mockReq = { body, session: {} };

			const { post } = buildAddCase({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			assert.strictEqual(mockDb.caseToMigrate.createWithDefaults.mock.callCount(), 1);
			const createArg = mockDb.caseToMigrate.createWithDefaults.mock.calls[0].arguments[0];
			assert.strictEqual(createArg, body.caseReference);

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
			const mockRes = {
				redirect: mock.fn()
			};
			const mockReq = { body, session: {} };

			const { post } = buildAddCase({ db: mockDb, logger: mockLogger() });
			await post(mockReq, mockRes);

			assert.strictEqual(mockDb.caseToMigrate.createWithDefaults.mock.callCount(), 1);
			const createArg = mockDb.caseToMigrate.createWithDefaults.mock.calls[0].arguments[0];
			assert.strictEqual(createArg, 'REF-001');
			assert.strictEqual(mockReq.session.addCaseSuccess, 'REF-001');
		});
	});
});
