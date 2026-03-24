import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';

/**
 * Cache structure for folder lookups
 * Outer Map: caseId -> inner Map
 * Inner Map: folderPath -> folderId
 */
type FolderCache = Map<string, Map<string, number>>;

/**
 * Gets folder ID with caching to avoid repeated database queries
 *
 * @param caseId - The case ID to look up folders for
 * @param path - The folder path to find
 * @param databaseClient - Database client for querying folders
 * @param caseReference - Case reference for error messages
 * @param folderCache - Cache instance to store/retrieve folder IDs
 * @returns The folder ID
 * @throws Error if folder not found
 */
export async function getFolderIdWithCache(
	caseId: number,
	path: string,
	databaseClient: SinkPrismaClient,
	caseReference: string,
	folderCache: FolderCache
): Promise<number> {
	const cacheKey = caseId.toString();

	if (!folderCache.has(cacheKey)) {
		folderCache.set(cacheKey, new Map());
	}

	const caseCache = folderCache.get(cacheKey)!;

	if (caseCache.has(path)) {
		return caseCache.get(path)!;
	}

	// Query folder from database
	const folder = await databaseClient.folder.findFirst({
		where: {
			caseId,
			path
		},
		select: { id: true }
	});

	if (!folder) {
		throw new Error(`Folder not found for case ${caseReference} with path ${path}. Ensure case folders are created.`);
	}

	// Cache the result
	caseCache.set(path, folder.id);
	return folder.id;
}
