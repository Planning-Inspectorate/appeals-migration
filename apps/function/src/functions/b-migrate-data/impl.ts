import { claimNextCaseToMigrate, updateDataStepComplete } from './migration/case-to-migrate.ts';
import { fetchCaseDetails } from './source/case-details.ts';
import { fetchEventDetails } from './source/event-details.ts';
import { mapSourceToSinkAppeal } from './mappers/map-source-to-sink.ts';
import { upsertAppeal } from './sink/appeal.ts';

import type { FunctionService } from '../../service.ts';
import type { TimerHandler } from '@azure/functions';

type Migration = {
	claimNextCaseToMigrate: typeof claimNextCaseToMigrate;
	updateDataStepComplete: typeof updateDataStepComplete;
};

type Source = {
	fetchCaseDetails: typeof fetchCaseDetails;
	fetchEventDetails: typeof fetchEventDetails;
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
	fetchCaseDetails,
	fetchEventDetails
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
): TimerHandler {
	return async (_timer, context) => {
		let caseReference: string | undefined;
		try {
			const migrationDatabase = service.databaseClient;
			const sourceDatabase = service.sourceDatabaseClient;
			const sinkDatabase = service.sinkDatabaseClient;

			const caseToMigrate = await migration.claimNextCaseToMigrate(migrationDatabase);

			if (!caseToMigrate) {
				context.log('No cases available to migrate');
				return;
			}
			caseReference = caseToMigrate.caseReference;
			context.log(`Processing case: ${caseReference}`);

			const caseDetails = await source.fetchCaseDetails(sourceDatabase, caseReference);

			if (!caseDetails) {
				context.error(`Case ${caseReference} not found in source database`);
				await migration.updateDataStepComplete(migrationDatabase, caseReference, false);
				return;
			}

			const events = await source.fetchEventDetails(sourceDatabase, caseReference);

			const mappedAppeal = mappers.mapSourceToSinkAppeal(
				caseDetails.data,
				events,
				(eventType: string | null | undefined) => {
					context.log(
						`Warning: Unknown or null event type "${eventType}" for case ${caseReference}, skipping event mapping`
					);
				}
			);

			const result = await sink.upsertAppeal(sinkDatabase, mappedAppeal);

			if (result.existed) {
				context.log(`Case ${caseReference} already exists in sink database`);
			} else {
				context.log(`Case ${caseReference} successfully migrated to sink database`);
			}

			await migration.updateDataStepComplete(migrationDatabase, caseReference, true);
		} catch (error) {
			context.error('Error during transformer run', error);
			if (caseReference) {
				try {
					await migration.updateDataStepComplete(service.databaseClient, caseReference, false);
				} catch (updateError) {
					context.error('Failed to mark migration step as failed', updateError);
				}
			}
			throw error;
		}
	};
}
