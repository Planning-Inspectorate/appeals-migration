import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database';
import { withRetry } from '@pins/appeals-migration-lib/util/retry.ts';

export async function upsertCaseReferences(
	migrationDatabase: MigrationPrismaClient,
	caseReferences: string[]
): Promise<void> {
	if (caseReferences.length === 0) return;

	for (const ref of caseReferences) {
		await withRetry(() =>
			migrationDatabase.caseToMigrate.upsert({
				where: { caseReference: ref },
				update: {},
				create: {
					caseReference: ref,
					DataStep: { create: {} },
					DocumentListStep: { create: {} },
					DocumentsStep: { create: {} },
					ValidationStep: { create: {} }
				}
			})
		);
	}
}
