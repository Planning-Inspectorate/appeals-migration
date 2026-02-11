import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';

/**
 * An example scheduled function implementation
 */
export function buildMigrateDocuments(service: FunctionService): MigrationFunction {
	return async (caseToMigrate, context) => {
		try {
			context.log('running example function on case ', caseToMigrate);

			// check the DB connection is working
			await service.databaseClient.$queryRaw`SELECT 1`;

			context.log('database OK');
		} catch (error: unknown) {
			let message;
			if (error instanceof Error) {
				context.log('Error during example function run:', error);
				message = error.message;
			}
			throw new Error('Error during example function run:' + message);
		}
	};
}
