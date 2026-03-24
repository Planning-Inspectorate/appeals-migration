import type { PrismaClient } from '@pins/odw-curated-database/src/client/client.ts';

export async function seedDev(dbClient: PrismaClient) {
	// TODO: add seed data
	await dbClient.$queryRaw`SELECT 1`;

	console.log('dev seed complete');
}
