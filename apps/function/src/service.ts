import { newDatabaseClient } from '@pins/appeals-migration-database';
import type { PrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';
import type { Config } from './config.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class FunctionService {
	#config: Config;
	dbClient: PrismaClient;

	constructor(config: Config) {
		this.#config = config;
		if (!config.database) {
			throw new Error('database config is required');
		}
		this.dbClient = newDatabaseClient(config.database);
	}

	get exampleSchedule() {
		return this.#config.example.schedule;
	}
}
