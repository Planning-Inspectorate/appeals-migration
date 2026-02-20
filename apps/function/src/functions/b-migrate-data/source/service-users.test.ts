// @ts-nocheck
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { fetchServiceUsers } from './service-users.ts';

describe('fetchServiceUsers', () => {
	test('fetches service users for a given case reference', async () => {
		const mockServiceUsers = [
			{
				id: '1',
				firstName: 'John',
				lastName: 'Doe',
				serviceUserType: 'Appellant',
				caseReference: 'CASE-001'
			},
			{
				id: '2',
				firstName: 'Jane',
				lastName: 'Smith',
				serviceUserType: 'Agent',
				caseReference: 'CASE-001'
			}
		];

		const mockDatabase = {
			appealServiceUser: {
				findMany: mock.fn(async ({ where }) => {
					if (where.caseReference === 'CASE-001') {
						return mockServiceUsers;
					}
					return [];
				})
			}
		};

		const result = await fetchServiceUsers(mockDatabase, 'CASE-001');

		assert.strictEqual(result.length, 2);
		assert.strictEqual(result[0].firstName, 'John');
		assert.strictEqual(result[1].firstName, 'Jane');
		assert.strictEqual(mockDatabase.appealServiceUser.findMany.mock.calls.length, 1);
		assert.deepStrictEqual(mockDatabase.appealServiceUser.findMany.mock.calls[0].arguments[0], {
			where: { caseReference: 'CASE-001' }
		});
	});

	test('returns empty array when no service users found', async () => {
		const mockDatabase = {
			appealServiceUser: {
				findMany: mock.fn(async () => [])
			}
		};

		const result = await fetchServiceUsers(mockDatabase, 'CASE-999');

		assert.strictEqual(result.length, 0);
		assert.strictEqual(mockDatabase.appealServiceUser.findMany.mock.calls.length, 1);
	});

	test('passes correct case reference to database query', async () => {
		const mockDatabase = {
			appealServiceUser: {
				findMany: mock.fn(async () => [])
			}
		};

		await fetchServiceUsers(mockDatabase, 'CASE-ABC-123');

		const callArgs = mockDatabase.appealServiceUser.findMany.mock.calls[0].arguments[0];
		assert.strictEqual(callArgs.where.caseReference, 'CASE-ABC-123');
	});
});
