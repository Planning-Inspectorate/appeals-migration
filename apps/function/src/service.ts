import { newDatabaseClient } from '@pins/appeals-migration-database';
import { newOdwDatabaseClient } from '@pins/odw-curated-database';
import { newManageAppealsDatabaseClient } from '@pins/manage-appeals-database';
import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';
import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';
import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import type { Config } from './config.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class FunctionService {
	#config: Config;
	databaseClient: MigrationPrismaClient;
	sourceDatabaseClient: SourcePrismaClient;
	sinkDatabaseClient: SinkPrismaClient;

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
	}

	get aListCasesToMigrateSchedule() {
		return this.#config.functions.aListCasesToMigrate.schedule;
	}

	get bTransformerSchedule() {
		return this.#config.functions.bTransformer.schedule;
	}

	get cListDocumentsToMigrateSchedule() {
		return this.#config.functions.cListDocumentsToMigrate.schedule;
	}

	get dMigrateDocumentsSchedule() {
		return this.#config.functions.dMigrateDocuments.schedule;
	}

	get eValidatorSchedule() {
		return this.#config.functions.eValidator.schedule;
	}
}
