import { loadConfig } from '../configuration/config.ts';
import { newManageAppealsDatabaseClient } from '../index.ts';
import { seedDev } from './data-dev.ts';

async function run() {
	const config = loadConfig();

	const dbClient = newManageAppealsDatabaseClient(config.db);

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
