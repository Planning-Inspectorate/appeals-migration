import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';

export async function readToMigrateParameters(migrationDatabase: MigrationPrismaClient) {
	try {
		return await migrationDatabase.toMigrateParameter.findMany();
	} catch (error) {
		throw new Error('Failed to read ToMigrateParameter records', {
			cause: error instanceof Error ? error : undefined
		});
	}
}
