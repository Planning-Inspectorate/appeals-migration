import { DefaultAzureCredential } from '@azure/identity';
import { ServiceBusAdministrationClient, ServiceBusClient } from '@azure/service-bus';
import { BlobServiceClient } from '@azure/storage-blob';
import { newDatabaseClient } from '@pins/appeals-migration-database';
import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';
import { HorizonWebClient } from '@pins/appeals-migration-lib/horizon/web/horizon-web-client.ts';
import { newManageAppealsDatabaseClient } from '@pins/manage-appeals-database';
import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import { newOdwDatabaseClient } from '@pins/odw-curated-database';
import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';
import type { Config } from './config.ts';
import type { SinkDocumentClient, SourceDocumentClient } from './types.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class FunctionService {
	#config: Config;
	databaseClient: MigrationPrismaClient;
	sourceDocumentClient: SourceDocumentClient;
	sourceDatabaseClient: SourcePrismaClient;
	sinkDatabaseClient: SinkPrismaClient;
	sinkDocumentClient: SinkDocumentClient;
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

		const blobClient = new BlobServiceClient(
			`https://${config.manageAppeals.documents.accountName}.blob.core.windows.net`,
			new DefaultAzureCredential()
		);
		this.sinkDocumentClient = blobClient.getContainerClient(config.manageAppeals.documents.containerName);

		this.sourceDocumentClient = new HorizonWebClient(config.horizon);
	}

	get aListCasesToMigrateSchedule() {
		return this.#config.functions.aListCasesToMigrate.schedule;
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

	get migrationStepUpdateChunkSize() {
		return this.#config.functions.dispatcher.migrationStepUpdateChunkSize;
	}

	get serviceBusParallelism() {
		return this.#config.functions.dispatcher.serviceBusParallelism;
	}
}
