import { newDatabaseClient } from '@pins/appeals-migration-database';
import { newOdwDatabaseClient } from '@pins/odw-curated-database';
import { newManageAppealsDatabaseClient } from '@pins/manage-appeals-database';
import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';
import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';
import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import type { Config } from './config.ts';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import { HorizonWebClient } from '@pins/appeals-migration-lib/horizon/web/horizon-web-client.ts';

/**
 * This class encapsulates all the services and clients for the application
 */
export class FunctionService {
	#config: Config;
	databaseClient: MigrationPrismaClient;
	sourceDatabaseClient: SourcePrismaClient;
	sinkDatabaseClient: SinkPrismaClient;
	sinkBlobContainerClient: ContainerClient;
	horizonWebClient: HorizonWebClient;

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

		const blobClient = new BlobServiceClient(
			`https://${config.manageAppeals.documents.accountName}.blob.core.windows.net`,
			new DefaultAzureCredential()
		);
		this.sinkBlobContainerClient = blobClient.getContainerClient(config.manageAppeals.documents.containerName);

		const horizon = config.horizon;
		this.horizonWebClient = new HorizonWebClient(horizon.baseUrl, horizon.username, horizon.password);
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
}
