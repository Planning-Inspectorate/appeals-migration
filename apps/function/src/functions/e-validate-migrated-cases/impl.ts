import type { CaseToMigrate } from 'packages/database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';

export function buildValidateMigratedCases(service: FunctionService): MigrationFunction {
	return async (itemToMigrate, context) => {
		const caseToMigrate = itemToMigrate as CaseToMigrate;
		context.log('running validate migrated cases function on case ', caseToMigrate);

		// check the DB connection is working
		await service.databaseClient.$queryRaw`SELECT 1`;
		context.log('database OK');
	};
}
