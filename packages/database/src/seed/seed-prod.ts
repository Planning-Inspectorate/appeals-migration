import { newDatabaseClient } from '../index.ts';
import { seedStaticData } from './data-static.ts';
import { loadConfig } from '../configuration/config.ts';

async function run() {
	const config = loadConfig();

	const dbClient = newDatabaseClient(config.db);

	try {
		await seedStaticData(dbClient);
	} catch (error) {
		console.error(error);
		throw error;
	} finally {
		await dbClient.$disconnect();
	}
}

run();
