// @ts-nocheck
import { describe, test, mock } from 'node:test';
import { buildTransformer } from './impl.ts';
import assert from 'node:assert';

describe('b-transformer-impl', () => {
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
		const handler = buildTransformer(service);
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
		const handler = buildTransformer(service);
		await assert.rejects(() => handler({}, context));
		assert.strictEqual(service.dbClient.$queryRaw.mock.callCount(), 1);
		assert.strictEqual(context.log.mock.callCount(), 2);
		assert.strictEqual(context.log.mock.calls[1].arguments[0], 'Error during example function run:');
		const err = context.log.mock.calls[1].arguments[1];
		assert.ok(err instanceof Error);
		assert.strictEqual(err.message, 'database error');
	});
});
