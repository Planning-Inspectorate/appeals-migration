// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { upsertAppeal } from './appeal.ts';

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
});
