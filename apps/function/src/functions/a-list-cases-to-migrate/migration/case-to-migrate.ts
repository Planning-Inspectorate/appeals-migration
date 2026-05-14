import type { MigrationPrismaClient } from '@pins/appeals-migration-database';
import type { CaseToMigrateUpdateInput } from '@pins/appeals-migration-database/src/client/models/CaseToMigrate.ts';
import { withRetry } from '@pins/appeals-migration-lib/util/retry.ts';
import type { ReferenceId } from '../source/case-reference.ts';

export async function upsertCaseReferences(
	migrationDatabase: MigrationPrismaClient,
	cases: ReferenceId[]
): Promise<void> {
	if (cases.length === 0) return;

	for (const ref of cases) {
		const update: CaseToMigrateUpdateInput = {};
		if (ref.caseId) {
			update.sourceCaseId = ref.caseId.toString();
		}
		await withRetry(() =>
			migrationDatabase.caseToMigrate.upsert({
				where: { caseReference: ref.caseReference },
				update,
				create: {
					caseReference: ref.caseReference,
					sourceCaseId: ref.caseId?.toString(),
					DataStep: { create: {} },
					DocumentListStep: { create: {} },
					DocumentsStep: { create: {} },
					ValidationStep: { create: {} }
				}
			})
		);
	}
}
