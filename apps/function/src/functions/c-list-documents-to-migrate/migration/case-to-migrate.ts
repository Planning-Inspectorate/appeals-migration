import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database';

export interface AvailableCase {
	caseReference: string;
	documentListStepId: number;
}

export async function findAvailableCaseForDocumentList(
	migrationDatabase: MigrationPrismaClient
): Promise<AvailableCase | null> {
	const availableCase = await migrationDatabase.caseToMigrate.findFirst({
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

	return availableCase;
}

export async function processDocumentListStep(tx: MigrationPrismaClient, documentListStepId: number): Promise<boolean> {
	const claimResult = await tx.migrationStep.updateMany({
		where: {
			id: documentListStepId,
			inProgress: false,
			complete: false
		},
		data: { inProgress: true }
	});

	return claimResult.count > 0;
}

export async function markDocumentListStepComplete(
	tx: MigrationPrismaClient,
	documentListStepId: number
): Promise<void> {
	await tx.migrationStep.update({
		where: { id: documentListStepId },
		data: {
			inProgress: false,
			complete: true
		}
	});
}
