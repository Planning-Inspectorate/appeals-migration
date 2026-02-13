import type { PrismaClient as MigrationPrismaClient } from '@pins/appeals-migration-database';
import type { DocumentInfo } from '../source/document.ts';

export async function upsertDocumentsToMigrate(
	migrationDatabase: MigrationPrismaClient,
	documents: DocumentInfo[]
): Promise<void> {
	if (documents.length === 0) return;

	for (const doc of documents) {
		await migrationDatabase.documentToMigrate.upsert({
			where: { documentId: doc.documentId },
			update: {},
			create: {
				documentId: doc.documentId,
				caseReference: doc.caseReference,
				MigrationStep: { create: {} }
			}
		});
	}
}
