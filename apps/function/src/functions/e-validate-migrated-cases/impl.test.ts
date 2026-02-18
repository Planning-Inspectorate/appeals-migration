// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { buildValidateMigratedCases } from './impl.ts';

describe('e-validate-migrated-cases-impl', () => {
	const newService = () => {
		return {
			databaseClient: {
				$queryRaw: mock.fn()
			}
		};
	};
	test('should call context.log on success', async () => {
		const service = newService();
		const context = {
			log: mock.fn()
		};
		service.databaseClient.$queryRaw.mock.mockImplementationOnce(() => {
			return '1';
		});
		const handler = buildValidateMigratedCases(service);
		await handler({}, context);
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(context.log.mock.callCount(), 2);
		assert.strictEqual(context.log.mock.calls[1].arguments[0], 'database OK');
	});

	test('should call context.log on error', async () => {
		const service = newService();
		const context = {
			log: mock.fn()
		};
		service.databaseClient.$queryRaw.mock.mockImplementationOnce(() => {
			throw new Error('database error');
		});
		const handler = buildValidateMigratedCases(service);
		await assert.rejects(() => handler({}, context));
		assert.strictEqual(service.databaseClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(context.log.mock.callCount(), 1);
		assert.strictEqual(context.log.mock.calls[0].arguments[0], 'running validate migrated cases function on case ');
	});
});
