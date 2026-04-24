import type { MigrationPrismaClient } from '@pins/appeals-migration-database';

export async function seedStaticData(dbClient: MigrationPrismaClient) {
	// TODO: add static seed data
	await dbClient.$queryRaw`SELECT 1`;
	console.log('static data seed complete');
}
