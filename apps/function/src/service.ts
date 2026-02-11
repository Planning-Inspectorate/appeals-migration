import { ServiceBusAdministrationClient, ServiceBusClient } from '@azure/service-bus';
import { newDatabaseClient } from '@pins/appeals-migration-database';
import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';
import { newManageAppealsDatabaseClient } from '@pins/manage-appeals-database';
import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import { newOdwDatabaseClient } from '@pins/odw-curated-database';
import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';
import type { Config } from './config.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class FunctionService {
	#config: Config;
	databaseClient: MigrationPrismaClient;
	sourceDatabaseClient: SourcePrismaClient;
	sinkDatabaseClient: SinkPrismaClient;
	serviceBusClient: ServiceBusClient;
	serviceBusAdministrationClient: ServiceBusAdministrationClient;

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
		this.serviceBusClient = new ServiceBusClient(config.serviceBus);
		this.serviceBusAdministrationClient = new ServiceBusAdministrationClient(config.serviceBus);
	}

	get aListCasesToMigrateSchedule() {
		return this.#config.functions.aListCasesToMigrate.schedule;
	}

	get bMigrateDataSchedule() {
		return this.#config.functions.bMigrateData.schedule;
	}

	get cListDocumentsToMigrateSchedule() {
		return this.#config.functions.cListDocumentsToMigrate.schedule;
	}

	get dMigrateDocumentsSchedule() {
		return this.#config.functions.dMigrateDocuments.schedule;
	}

	get eValidateMigratedCasesSchedule() {
		return this.#config.functions.eValidateMigratedCases.schedule;
	}

	get dispatcherSchedule() {
		return this.#config.functions.dispatcher.schedule;
	}

	get dispatcherEndWindow() {
		return {
			endHour: this.#config.functions.dispatcher.endHour,
			endMinutes: this.#config.functions.dispatcher.endMinutes
		};
	}

	get dispatcherQueueTarget() {
		return this.#config.functions.dispatcher.queueTarget;
	}
}
