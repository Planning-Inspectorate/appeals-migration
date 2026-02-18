import type { DocumentToMigrate } from 'packages/database/src/client/client.ts';
import type { FunctionService } from '../../service.ts';
import type { MigrationFunction } from '../../types.ts';

export function buildMigrateDocuments(service: FunctionService): MigrationFunction {
	return async (itemToMigrate, context) => {
		const documentToMigrate = itemToMigrate as DocumentToMigrate;
		context.log('running d-migrate-documents on ', documentToMigrate);
		await service.databaseClient.$queryRaw`SELECT 1`;
		context.log('database OK');
	};
}
