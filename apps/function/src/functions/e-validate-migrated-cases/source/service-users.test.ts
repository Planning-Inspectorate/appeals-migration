// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { fetchSourceServiceUsers } from './service-users.ts';

describe('fetchSourceServiceUsers', () => {
	test('returns service users for case', async () => {
		const sourceDatabase = { appealServiceUser: { findMany: mock.fn() } };
		const mockUsers = [
			{ serviceUserId: 1, serviceUserType: 'Appellant', firstName: 'Jane' },
			{ serviceUserId: 2, serviceUserType: 'Agent', firstName: 'John' }
		];
		sourceDatabase.appealServiceUser.findMany.mock.mockImplementationOnce(() => mockUsers);

		const result = await fetchSourceServiceUsers(sourceDatabase, 'CASE-001');

		assert.deepStrictEqual(result, mockUsers);
		assert.deepStrictEqual(sourceDatabase.appealServiceUser.findMany.mock.calls[0].arguments[0], {
			where: { caseReference: 'CASE-001' }
		});
	});

	test('returns empty array when no service users found', async () => {
		const sourceDatabase = { appealServiceUser: { findMany: mock.fn() } };
		sourceDatabase.appealServiceUser.findMany.mock.mockImplementationOnce(() => []);

		const result = await fetchSourceServiceUsers(sourceDatabase, 'CASE-999');

		assert.deepStrictEqual(result, []);
	});
});
