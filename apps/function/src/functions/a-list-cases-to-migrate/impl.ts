import { mapToMigrateParameterToWhere } from './mappers/map-to-migrate-parameter.ts';
import { upsertCaseReferences } from './migration/case-to-migrate.ts';
import { fetchCaseReferences, type ReferenceId } from './source/case-reference.ts';

import type { TimerHandler } from '@azure/functions';
import type { MigrationPrismaClient } from '@pins/appeals-migration-database';
import type { ToMigrateParameter } from '@pins/appeals-migration-database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';

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

export function buildListCasesToMigrate(
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
			context.log('Read', params.length, 'parameters');

			const allCases = new Map<string, ReferenceId>();

			for (const param of params) {
				const whereClause = mappers.mapToMigrateParameterToWhere(param);

				const refs = await source.fetchCaseReferences(sourceDatabase, whereClause, whereClause, param.limit);
				refs.forEach((r) => allCases.set(r.caseReference, r));
			}

			context.log('Upserting', allCases.size, 'cases');

			await migration.upsertCaseReferences(migrationDatabase, Array.from(allCases.values()));

			for (const ref of allCases.values()) {
				if (!ref.caseId) {
					context.log(ref.caseReference, 'no case ID to set custom view');
					continue;
				}
				await service.customViewManager.addInQueueView(ref.caseId?.toString());
			}
		} catch (error) {
			context.error('Error during list builder run', error);
			throw error;
		}
	};
}
