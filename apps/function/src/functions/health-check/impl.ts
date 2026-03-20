import type { HttpHandler } from '@azure/functions';
import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';
import type { PrismaClient as SinkPrismaClient } from '@pins/manage-appeals-database/src/client/client.ts';
import type { PrismaClient as SourcePrismaClient } from '@pins/odw-curated-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';

type Database = {
	checkMigrationDatabase: (client: MigrationPrismaClient) => Promise<void>;
	checkOdwDatabase: (client: SourcePrismaClient) => Promise<void>;
	checkManageAppealsDatabase: (client: SinkPrismaClient) => Promise<void>;
};

const defaultDatabase: Database = {
	checkMigrationDatabase: async (client) => {
		await client.$queryRaw`SELECT 1`;
	},
	checkOdwDatabase: async (client) => {
		await client.$queryRaw`SELECT 1`;
	},
	checkManageAppealsDatabase: async (client) => {
		await client.$queryRaw`SELECT 1`;
	}
};

type HealthCheckResponse = {
	migrationDatabase: 'OK' | 'ERROR';
	odwDatabase: 'OK' | 'ERROR';
	manageAppealsDatabase: 'OK' | 'ERROR';
	migrationDatabaseError?: string;
	odwDatabaseError?: string;
	manageAppealsDatabaseError?: string;
};

export function buildHealthCheck(service: FunctionService, database: Database = defaultDatabase): HttpHandler {
	return async () => {
		const [migrationResult, odwResult, manageAppealsResult] = await Promise.allSettled([
			database.checkMigrationDatabase(service.databaseClient),
			database.checkOdwDatabase(service.sourceDatabaseClient),
			database.checkManageAppealsDatabase(service.sinkDatabaseClient)
		]);

		const response: HealthCheckResponse = {
			migrationDatabase: migrationResult.status === 'fulfilled' ? 'OK' : 'ERROR',
			odwDatabase: odwResult.status === 'fulfilled' ? 'OK' : 'ERROR',
			manageAppealsDatabase: manageAppealsResult.status === 'fulfilled' ? 'OK' : 'ERROR'
		};

		if (migrationResult.status === 'rejected') {
			response.migrationDatabaseError = migrationResult.reason?.message ?? String(migrationResult.reason);
		}
		if (odwResult.status === 'rejected') {
			response.odwDatabaseError = odwResult.reason?.message ?? String(odwResult.reason);
		}
		if (manageAppealsResult.status === 'rejected') {
			response.manageAppealsDatabaseError = manageAppealsResult.reason?.message ?? String(manageAppealsResult.reason);
		}

		return {
			status: 200,
			jsonBody: response
		};
	};
}
