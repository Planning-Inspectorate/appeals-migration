import type { MigrationPrismaClient } from '@pins/appeals-migration-database';

export async function seedDev(dbClient: MigrationPrismaClient) {
	// TODO: add seed data
	await dbClient.$queryRaw`SELECT 1`;

	console.log('dev seed complete');
}
