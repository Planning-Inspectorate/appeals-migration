import { readToMigrateParameters } from './migration/to-migrate-parameter.ts';
import {
	mapToMigrateParameterToAppealHasWhere,
	mapToMigrateParameterToAppealS78Where
} from './mappers/map-to-migrate-parameter-to-where.ts';
import { fetchCaseReferences } from './source/case-reference.ts';
import { upsertCaseReferences } from './migration/case-to-migrate.ts';

import type { FunctionService } from '../../service.ts';
import type { TimerHandler } from '@azure/functions';

export function buildListBuilder(service: FunctionService): TimerHandler {
	return async (_timer, context) => {
		try {
			const migrationDatabase = service.databaseClient;
			const sourceDatabase = service.sourceDatabaseClient;

			const params = await readToMigrateParameters(migrationDatabase);

			const allRefs = new Set<string>();

			for (const param of params) {
				const hasWhere = mapToMigrateParameterToAppealHasWhere(param);
				const s78Where = mapToMigrateParameterToAppealS78Where(param);

				const refs = await fetchCaseReferences(sourceDatabase, hasWhere, s78Where);

				refs.forEach((r) => allRefs.add(r));
			}

			await upsertCaseReferences(migrationDatabase, Array.from(allRefs));
		} catch (error) {
			context.log('Error during list builder run', error);
			// add error logging with context
			throw error;
		}
	};
}

// Test error handling in catch block
// Test the full flow
