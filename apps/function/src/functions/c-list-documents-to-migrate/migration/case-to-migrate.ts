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
				DocumentListStep: { status: 'waiting' },
				DataStep: { status: 'complete' }
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
			data: { status: 'queued' }
		});

		return caseToProcess;
	});
}

export async function updateDocumentListStepComplete(
	migrationDatabase: MigrationPrismaClient,
	caseReference: string,
	status: string,
	errorMessage?: string
): Promise<void> {
	await migrationDatabase.caseToMigrate.update({
		where: { caseReference },
		data: {
			DocumentListStep: {
				update: {
					status,
					completedAt: new Date(),
					errorMessage
				}
			}
		}
	});
}
