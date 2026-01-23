import { newOdwDatabaseClient } from '../index.ts';
import { seedDev } from './data-dev.ts';
import { loadConfig } from '../configuration/config.ts';

async function run() {
	const config = loadConfig();

	const dbClient = newOdwDatabaseClient(config.db);

	try {
		await seedDev(dbClient);
	} catch (error) {
		console.error(error);
		throw error;
	} finally {
		await dbClient.$disconnect();
	}
}

run();
