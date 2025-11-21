import { newDatabaseClient } from '@pins/appeals-migration-database';
import type { PrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';
import type { Config } from './config.ts';
import { HorizonApiClient } from '@pins/appeals-migration-lib/horizon/horizon-api-client.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class FunctionService {
	#config: Config;
	dbClient: PrismaClient;
	horizonApiClient: HorizonApiClient;

	constructor(config: Config) {
		this.#config = config;
		if (!config.database) {
			throw new Error('database config is required');
		}
		this.dbClient = newDatabaseClient(config.database);
		this.horizonApiClient = new HorizonApiClient(config.horizon.apiEndpoint, config.horizon.apiTimeoutMs);
	}

	get aListBuilderSchedule() {
		return this.#config.functions.aListBuilder.schedule;
	}

	get bTransformerSchedule() {
		return this.#config.functions.bTransformer.schedule;
	}

	get cDocumentHandlerSchedule() {
		return this.#config.functions.cDocumentHandler.schedule;
	}

	get dValidatorSchedule() {
		return this.#config.functions.dValidator.schedule;
	}
}
