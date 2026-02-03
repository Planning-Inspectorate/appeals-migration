import { newDatabaseClient } from '@pins/appeals-migration-database';
import { newOdwDatabaseClient } from '@pins/odw-curated-database';
import { newManageAppealsDatabaseClient } from '@pins/manage-appeals-database';
import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';
import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';
import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import type { Config } from './config.ts';
import { HorizonApiClient } from '@pins/appeals-migration-lib/horizon/api/horizon-api-client.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class FunctionService {
	#config: Config;
	databaseClient: MigrationPrismaClient;
	sourceDatabaseClient: SourcePrismaClient;
	sinkDatabaseClient: SinkPrismaClient;
	horizonApiClient: HorizonApiClient;

	constructor(config: Config) {
		this.#config = config;
		if (!config.database) {
			throw new Error('database config is required');
		}
		if (!config.sourceDatabase) {
			throw new Error('sourceDatabase config is required');
		}
		if (!config.sinkDatabase) {
			throw new Error('sinkDatabase config is required');
		}
		this.databaseClient = newDatabaseClient(config.database);
		this.sourceDatabaseClient = newOdwDatabaseClient(config.sourceDatabase);
		this.sinkDatabaseClient = newManageAppealsDatabaseClient(config.sinkDatabase);
		this.horizonApiClient = new HorizonApiClient(config.horizon.apiEndpoint, config.horizon.apiTimeoutMs);
	}

	get aListBuilderSchedule() {
		return this.#config.functions.aListBuilder.schedule;
	}

	get bTransformerSchedule() {
		return this.#config.functions.bTransformer.schedule;
	}

	get cDocumentListBuilderSchedule() {
		return this.#config.functions.cDocumentListBuilder.schedule;
	}

	get dDocumentHandlerSchedule() {
		return this.#config.functions.dDocumentHandler.schedule;
	}

	get eValidatorSchedule() {
		return this.#config.functions.eValidator.schedule;
	}
}
