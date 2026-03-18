// @ts-nocheck
import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import assert from 'node:assert';
import { describe, mock, test } from 'node:test';
import { getFolderIdWithCache } from './get-folder-id-with-cache.ts';

describe('getFolderIdWithCache', () => {
	test('should return cached folder ID on second call', async () => {
		const findFirstMock = mock.fn(async () => ({ id: 123 }));
		const mockDatabaseClient = {
			folder: {
				findFirst: findFirstMock
			}
		} as unknown as SinkPrismaClient;

		const folderCache = new Map<string, Map<string, number>>();

		const result1 = await getFolderIdWithCache(100, 'appellant-case', mockDatabaseClient, 'APP/123', folderCache);

		assert.strictEqual(result1, 123);
		assert.strictEqual(findFirstMock.mock.callCount(), 1);

		// Second call should use cache (no additional database query)
		const result2 = await getFolderIdWithCache(100, 'appellant-case', mockDatabaseClient, 'APP/123', folderCache);

		assert.strictEqual(result2, 123);
		assert.strictEqual(findFirstMock.mock.callCount(), 1);
	});

	test('should query database for different folder paths', async () => {
		const mockDatabaseClient = {
			folder: {
				findFirst: async ({ where }: { where: { path: string } }) =>
					where.path === 'appellant-case' ? { id: 123 } : { id: 456 }
			}
		} as unknown as SinkPrismaClient;

		const folderCache = new Map<string, Map<string, number>>();

		const result1 = await getFolderIdWithCache(100, 'appellant-case', mockDatabaseClient, 'APP/123', folderCache);

		const result2 = await getFolderIdWithCache(100, 'representation', mockDatabaseClient, 'APP/123', folderCache);

		assert.strictEqual(result1, 123);
		assert.strictEqual(result2, 456);
	});

	test('should handle different case IDs separately', async () => {
		const mockDatabaseClient = {
			folder: {
				findFirst: async ({ where }: { where: { caseId: number } }) =>
					where.caseId === 100 ? { id: 123 } : { id: 789 }
			}
		} as unknown as SinkPrismaClient;

		const folderCache = new Map<string, Map<string, number>>();

		const result1 = await getFolderIdWithCache(100, 'appellant-case', mockDatabaseClient, 'APP/123', folderCache);

		const result2 = await getFolderIdWithCache(200, 'appellant-case', mockDatabaseClient, 'APP/456', folderCache);

		assert.strictEqual(result1, 123);
		assert.strictEqual(result2, 789);
	});

	test('should throw error when folder not found', async () => {
		const mockDatabaseClient = {
			folder: {
				findFirst: async () => null
			}
		} as unknown as SinkPrismaClient;

		const folderCache = new Map<string, Map<string, number>>();

		await assert.rejects(
			async () => getFolderIdWithCache(100, 'nonexistent', mockDatabaseClient, 'APP/123', folderCache),
			{
				name: 'Error',
				message: 'Folder not found for case APP/123 with path nonexistent. Ensure case folders are created.'
			}
		);
	});
});
