// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { upsertAppeal } from './appeal.ts';

const createPrismaError = (code: string) => Object.assign(new Error(`Prisma error ${code}`), { code });

describe('upsertAppeal', () => {
	test('creates new appeal when it does not exist', async () => {
		const sinkDatabase = { appeal: { findUnique: mock.fn(), create: mock.fn() } };
		const mockAppeal = { id: 1, reference: 'CASE-001' };
		sinkDatabase.appeal.findUnique.mock.mockImplementationOnce(() => null);
		sinkDatabase.appeal.create.mock.mockImplementationOnce(() => mockAppeal);

		const result = await upsertAppeal(sinkDatabase, { reference: 'CASE-001' });

		assert.deepStrictEqual(result, { existed: false, appeal: mockAppeal });
	});

	test('returns existing appeal when it already exists', async () => {
		const sinkDatabase = { appeal: { findUnique: mock.fn(), create: mock.fn() } };
		const existingAppeal = { id: 1, reference: 'CASE-001' };
		sinkDatabase.appeal.findUnique.mock.mockImplementationOnce(() => existingAppeal);

		const result = await upsertAppeal(sinkDatabase, { reference: 'CASE-001' });

		assert.deepStrictEqual(result, { existed: true, appeal: existingAppeal });
	});

	test('throws error for invalid reference values', async () => {
		const sinkDatabase = { appeal: { findUnique: mock.fn(), create: mock.fn() } };
		const invalidReferences = [null, undefined, ''];

		for (const reference of invalidReferences) {
			await assert.rejects(() => upsertAppeal(sinkDatabase, { reference }), {
				message: 'Appeal reference is required'
			});
		}
	});

	test('retries on transient Prisma error and succeeds', async () => {
		const sinkDatabase = { appeal: { findUnique: mock.fn(), create: mock.fn() } };
		const mockAppeal = { id: 1, reference: 'CASE-001' };
		let callCount = 0;
		sinkDatabase.appeal.findUnique.mock.mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				throw createPrismaError('P1001');
			}
			return null;
		});
		sinkDatabase.appeal.create.mock.mockImplementation(() => mockAppeal);

		const result = await upsertAppeal(sinkDatabase, { reference: 'CASE-001' });

		assert.deepStrictEqual(result, { existed: false, appeal: mockAppeal });
		assert.strictEqual(sinkDatabase.appeal.findUnique.mock.callCount(), 2);
	});

	test('throws after max retry attempts exhausted', async () => {
		const sinkDatabase = { appeal: { findUnique: mock.fn(), create: mock.fn() } };
		const error = createPrismaError('P1001');
		sinkDatabase.appeal.findUnique.mock.mockImplementation(() => {
			throw error;
		});

		await assert.rejects(
			() => upsertAppeal(sinkDatabase, { reference: 'CASE-001' }),
			(thrown) => {
				assert.strictEqual(thrown, error);
				return true;
			}
		);

		assert.strictEqual(sinkDatabase.appeal.findUnique.mock.callCount(), 3);
	});

	test('does not retry on non-retryable Prisma error', async () => {
		const sinkDatabase = { appeal: { findUnique: mock.fn(), create: mock.fn() } };
		const error = createPrismaError('P2002');
		sinkDatabase.appeal.findUnique.mock.mockImplementation(() => {
			throw error;
		});

		await assert.rejects(
			() => upsertAppeal(sinkDatabase, { reference: 'CASE-001' }),
			(thrown) => {
				assert.strictEqual(thrown, error);
				return true;
			}
		);

		assert.strictEqual(sinkDatabase.appeal.findUnique.mock.callCount(), 1);
	});
});
