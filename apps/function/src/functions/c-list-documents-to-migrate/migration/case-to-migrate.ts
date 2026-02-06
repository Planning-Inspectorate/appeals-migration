import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database';

export interface ClaimedCase {
	caseReference: string;
	documentListStepId: number;
}

export async function claimNextCaseForDocumentList(
	migrationDatabase: MigrationPrismaClient
): Promise<ClaimedCase | null> {
	return migrationDatabase.$transaction(async (tx) => {
		const caseToProcess = await tx.caseToMigrate.findFirst({
			where: {
				DocumentListStep: {
					inProgress: false,
					complete: false
				},
				DataStep: {
					complete: true
				}
			},
			orderBy: { caseReference: 'asc' },
			select: {
				caseReference: true,
				documentListStepId: true
			}
		});

		if (!caseToProcess) {
			return null;
		}

		await tx.migrationStep.update({
			where: { id: caseToProcess.documentListStepId },
			data: { inProgress: true }
		});

		return caseToProcess;
	});
}

export async function updateDocumentListStepComplete(
	migrationDatabase: MigrationPrismaClient,
	caseReference: string,
	complete: boolean
): Promise<void> {
	await migrationDatabase.caseToMigrate.update({
		where: { caseReference },
		data: {
			DocumentListStep: {
				update: {
					inProgress: false,
					complete
				}
			}
		}
	});
}
