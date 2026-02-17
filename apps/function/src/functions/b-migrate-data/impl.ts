import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';
import { mapSourceToSinkAppeal } from './mappers/map-source-to-sink.ts';
import { upsertAppeal } from './sink/appeal.ts';
import { fetchCaseDetails } from './source/case-details.ts';
import { fetchEventDetails } from './source/event-details.ts';

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
	source: Source = defaultSource,
	mappers: Mappers = defaultMappers,
	sink: Sink = defaultSink
): MigrationFunction {
	return async (caseToMigrate, context) => {
		const sourceDatabase = service.sourceDatabaseClient;
		const sinkDatabase = service.sinkDatabaseClient;
		const caseReference = caseToMigrate.caseReference;
		context.log(`Processing case: ${caseReference}`);

		const caseDetails = await source.fetchCaseDetails(sourceDatabase, caseReference);

		if (!caseDetails) {
			throw new Error(`Case ${caseReference} not found in source database`);
		}

		const events = await source.fetchEventDetails(sourceDatabase, caseReference);

		const mappedAppeal = mappers.mapSourceToSinkAppeal(caseDetails.data, events);

		const result = await sink.upsertAppeal(sinkDatabase, mappedAppeal);

		if (result.existed) {
			context.log(`Case ${caseReference} already exists in sink database`);
		} else {
			context.log(`Case ${caseReference} successfully migrated to sink database`);
		}
	};
}
