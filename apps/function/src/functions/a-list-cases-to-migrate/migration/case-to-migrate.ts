import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database';

export async function upsertCaseReferences(
	migrationDatabase: MigrationPrismaClient,
	caseReferences: string[]
): Promise<void> {
	if (caseReferences.length === 0) return;

	for (const ref of caseReferences) {
		await migrationDatabase.caseToMigrate.upsert({
			where: { caseReference: ref },
			update: {},
			create: {
				caseReference: ref,
				DataStep: { create: {} },
				DocumentListStep: { create: {} },
				DocumentsStep: { create: {} },
				ValidationStep: { create: {} }
			}
		});
	}
}
