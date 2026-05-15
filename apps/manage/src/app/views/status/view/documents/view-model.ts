import type { Prisma } from '@pins/appeals-migration-database/src/client/client.ts';

type DocumentToMigrateWithStep = Prisma.DocumentToMigrateGetPayload<{
	include: { MigrationStep: true };
}>;

export interface DocumentViewModel {
	documentId: string;
	status: string;
	errorMessage: string | null;
	startedAt: string | null;
	completedAt: string | null;
}

export interface DocumentsDetailViewModel {
	pageHeading: string;
	pageCaption: string;
	backLinkUrl: string;
	caseReference: string;
	documents: DocumentViewModel[];
	total: number;
	complete: number;
	failed: number;
	processing: number;
	queued: number;
	waiting: number;
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/London',
	dateStyle: 'long',
	timeStyle: 'medium'
});

function formatDocument(doc: DocumentToMigrateWithStep): DocumentViewModel {
	return {
		documentId: doc.documentId,
		status: doc.MigrationStep.status,
		errorMessage: doc.MigrationStep.errorMessage,
		startedAt: doc.MigrationStep.startedAt ? dateFormatter.format(doc.MigrationStep.startedAt) : null,
		completedAt: doc.MigrationStep.completedAt ? dateFormatter.format(doc.MigrationStep.completedAt) : null
	};
}

export function buildDocumentsDetailViewModel(
	caseReference: string,
	documents: DocumentToMigrateWithStep[]
): DocumentsDetailViewModel {
	const statusCounts = { waiting: 0, queued: 0, processing: 0, complete: 0, failed: 0 };
	for (const doc of documents) {
		const status = doc.MigrationStep.status as keyof typeof statusCounts;
		if (status in statusCounts) {
			statusCounts[status]++;
		}
	}

	return {
		pageHeading: 'Document migration status',
		pageCaption: caseReference,
		backLinkUrl: `/case/${encodeURIComponent(caseReference)}`,
		caseReference,
		documents: documents.map(formatDocument),
		total: documents.length,
		...statusCounts
	};
}
