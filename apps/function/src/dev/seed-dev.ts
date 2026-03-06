import { loadConfig } from '../config.ts';
import { FunctionService } from '../service.ts';
import { seedDev } from './data-dev.ts';

async function run() {
	const config = loadConfig();
	const service = new FunctionService(config);

	try {
		await seedDev(service);
	} catch (error) {
		console.error(error);
		throw error;
	} finally {
		await service.databaseClient.$disconnect();
		await service.sourceDatabaseClient.$disconnect();
		await service.sinkDatabaseClient.$disconnect();
	}
}

run();
