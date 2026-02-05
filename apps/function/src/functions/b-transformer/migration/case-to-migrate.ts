import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database/src/client/client.ts';

export async function claimNextCaseToMigrate(migrationDatabase: MigrationPrismaClient) {
	return migrationDatabase.$transaction(async (tx) => {
		const caseToMigrate = await tx.caseToMigrate.findFirst({
			where: { DataStep: { inProgress: false, complete: false } },
			orderBy: { caseReference: 'asc' }
		});

		if (!caseToMigrate) return null;

		await tx.migrationStep.update({
			where: { id: caseToMigrate.dataStepId },
			data: { inProgress: true }
		});

		return caseToMigrate;
	});
}

export async function updateDataStepComplete(
	migrationDatabase: MigrationPrismaClient,
	caseReference: string,
	complete: boolean
) {
	try {
		return await migrationDatabase.caseToMigrate.update({
			where: { caseReference },
			data: {
				DataStep: {
					update: {
						inProgress: false,
						complete
					}
				}
			}
		});
	} catch (error) {
		if (error && typeof error === 'object' && 'code' in error && error.code === 'P2001') {
			throw new Error(`Case ${caseReference} not found`);
		}
		throw error;
	}
}
