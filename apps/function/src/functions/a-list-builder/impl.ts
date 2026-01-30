import { mapToMigrateParameterToWhere } from './mappers/map-to-migrate-parameter.ts';
import { fetchCaseReferences } from './source/case-reference.ts';
import { upsertCaseReferences } from './migration/case-to-migrate.ts';

import type { FunctionService } from '../../service.ts';
import type { TimerHandler } from '@azure/functions';
import type {
	PrismaClient as MigrationPrismaClient,
	ToMigrateParameter
} from '@pins/appeals-migration-database/src/client/client.ts';

type Migration = {
	readToMigrateParameters: (migrationDatabase: MigrationPrismaClient) => Promise<ToMigrateParameter[]>;
	upsertCaseReferences: typeof upsertCaseReferences;
};

type Mappers = {
	mapToMigrateParameterToWhere: typeof mapToMigrateParameterToWhere;
};

type Source = {
	fetchCaseReferences: typeof fetchCaseReferences;
};

const defaultMigration: Migration = {
	readToMigrateParameters: (migrationDatabase) => migrationDatabase.toMigrateParameter.findMany(),
	upsertCaseReferences
};

const defaultMappers: Mappers = {
	mapToMigrateParameterToWhere
};

const defaultSource: Source = {
	fetchCaseReferences
};

export function buildListBuilder(
	service: FunctionService,
	migration: Migration = defaultMigration,
	mappers: Mappers = defaultMappers,
	source: Source = defaultSource
): TimerHandler {
	return async (_timer, context) => {
		try {
			const migrationDatabase = service.databaseClient;
			const sourceDatabase = service.sourceDatabaseClient;

			const params = await migration.readToMigrateParameters(migrationDatabase);

			const allRefs = new Set<string>();

			for (const param of params) {
				const whereClause = mappers.mapToMigrateParameterToWhere(param);

				const refs = await source.fetchCaseReferences(sourceDatabase, whereClause, whereClause);
				refs.forEach((r) => allRefs.add(r));
			}

			await migration.upsertCaseReferences(migrationDatabase, Array.from(allRefs));
		} catch (error) {
			context.error('Error during list builder run', error);
			throw error;
		}
	};
}
