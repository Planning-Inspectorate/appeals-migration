// @ts-nocheck
import assert from 'node:assert';
import { describe, test } from 'node:test';
import { createSourceDatabaseMock } from '../mock-data/database.ts';
import { fetchSourceServiceUsers } from './service-users.ts';

describe('fetchSourceServiceUsers', () => {
	test('returns service users for case', async () => {
		const sourceDatabase = createSourceDatabaseMock();
		const mockUsers = [
			{ serviceUserId: 1, serviceUserType: 'Appellant', firstName: 'Jane' },
			{ serviceUserId: 2, serviceUserType: 'Agent', firstName: 'John' }
		];
		sourceDatabase.appealServiceUser.findMany.mock.mockImplementationOnce(async () => mockUsers);

		const result = await fetchSourceServiceUsers(sourceDatabase, 'CASE-001');

		assert.deepStrictEqual(result, mockUsers);
		assert.deepStrictEqual(sourceDatabase.appealServiceUser.findMany.mock.calls[0].arguments[0], {
			where: { caseReference: 'CASE-001' }
		});
	});

	test('returns empty array when no service users found', async () => {
		const sourceDatabase = createSourceDatabaseMock();
		sourceDatabase.appealServiceUser.findMany.mock.mockImplementationOnce(async () => []);

		const result = await fetchSourceServiceUsers(sourceDatabase, 'CASE-999');

		assert.deepStrictEqual(result, []);
	});
});
