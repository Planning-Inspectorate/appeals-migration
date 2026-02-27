import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';

export interface ValidationResult {
	dataValidated: boolean;
	documentsValidated: boolean;
}

export async function saveValidationResult(
	migrationDatabase: MigrationPrismaClient,
	caseReference: string,
	result: ValidationResult
): Promise<void> {
	await migrationDatabase.caseToMigrate.update({
		where: { caseReference },
		data: {
			dataValidated: result.dataValidated,
			documentsValidated: result.documentsValidated
		}
	});
}
