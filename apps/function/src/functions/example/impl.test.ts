// @ts-nocheck
import { describe, test, mock } from 'node:test';
import { buildExampleFunction } from './impl.ts';
import assert from 'node:assert';

describe('example-function-impl', () => {
	const newService = () => {
		return {
			dbClient: {
				$queryRaw: mock.fn()
			}
		};
	};
	test('should call context.log on success', async () => {
		const service = newService();
		const context = {
			log: mock.fn()
		};
		service.dbClient.$queryRaw.mock.mockImplementationOnce(() => {
			return '1';
		});
		const handler = buildExampleFunction(service);
		await handler({}, context);
		assert.strictEqual(service.dbClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(context.log.mock.callCount(), 2);
		assert.strictEqual(context.log.mock.calls[1].arguments[0], 'database OK');
	});

	test('should call context.log on error', async () => {
		const service = newService();
		const context = {
			log: mock.fn()
		};
		service.dbClient.$queryRaw.mock.mockImplementationOnce(() => {
			throw new Error('database error');
		});
		const handler = buildExampleFunction(service);
		await assert.rejects(() => handler({}, context));
		assert.strictEqual(service.dbClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(context.log.mock.callCount(), 2);
		assert.strictEqual(context.log.mock.calls[1].arguments[0], 'Error during example function run:');
		const err = context.log.mock.calls[1].arguments[1];
		assert.ok(err instanceof Error);
		assert.strictEqual(err.message, 'database error');
	});
});
