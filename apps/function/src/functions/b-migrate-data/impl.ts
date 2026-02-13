import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';
import { mapSourceToSinkAppeal } from './mappers/map-source-to-sink.ts';
import { claimNextCaseToMigrate, updateDataStepComplete } from './migration/case-to-migrate.ts';
import { upsertAppeal } from './sink/appeal.ts';
import { fetchCaseDetails } from './source/case-details.ts';

type Migration = {
	claimNextCaseToMigrate: typeof claimNextCaseToMigrate;
	updateDataStepComplete: typeof updateDataStepComplete;
};

type Source = {
	fetchCaseDetails: typeof fetchCaseDetails;
};

type Mappers = {
	mapSourceToSinkAppeal: typeof mapSourceToSinkAppeal;
};

type Sink = {
	upsertAppeal: typeof upsertAppeal;
};

const defaultMigration: Migration = {
	claimNextCaseToMigrate,
	updateDataStepComplete
};

const defaultSource: Source = {
	fetchCaseDetails
};

const defaultMappers: Mappers = {
	mapSourceToSinkAppeal
};

const defaultSink: Sink = {
	upsertAppeal
};

export function buildMigrateData(
	service: FunctionService,
	migration: Migration = defaultMigration,
	source: Source = defaultSource,
	mappers: Mappers = defaultMappers,
	sink: Sink = defaultSink
): MigrationFunction {
	return async (caseToMigrate, context) => {
		try {
			const migrationDatabase = service.databaseClient;
			const sourceDatabase = service.sourceDatabaseClient;
			const sinkDatabase = service.sinkDatabaseClient;
			const caseReference = caseToMigrate.caseReference;
			context.log(`Processing case: ${caseReference}`);

			const caseDetails = await source.fetchCaseDetails(sourceDatabase, caseReference);

			if (!caseDetails) {
				const errorMessage = `Case ${caseReference} not found in source database`;
				context.error(errorMessage);
				await migration.updateDataStepComplete(migrationDatabase, caseReference, 'failed', errorMessage);
				return;
			}

			const mappedAppeal = mappers.mapSourceToSinkAppeal(caseDetails.data);

			const result = await sink.upsertAppeal(sinkDatabase, mappedAppeal);

			if (result.existed) {
				context.log(`Case ${caseReference} already exists in sink database`);
			} else {
				context.log(`Case ${caseReference} successfully migrated to sink database`);
			}

			await migration.updateDataStepComplete(migrationDatabase, caseReference, 'complete');
		} catch (error) {
			context.error('Error during transformer run', error);
			throw error;
		}
	};
}
