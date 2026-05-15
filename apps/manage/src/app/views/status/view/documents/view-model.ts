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
	statusFilter: string | undefined;
	baseUrl: string;
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

const VALID_STATUSES = ['waiting', 'queued', 'processing', 'complete', 'failed'] as const;

export function buildDocumentsDetailViewModel(
	caseReference: string,
	documents: DocumentToMigrateWithStep[],
	statusFilter?: string
): DocumentsDetailViewModel {
	const statusCounts = { waiting: 0, queued: 0, processing: 0, complete: 0, failed: 0 };
	for (const doc of documents) {
		const status = doc.MigrationStep.status as keyof typeof statusCounts;
		if (status in statusCounts) {
			statusCounts[status]++;
		}
	}

	const validFilter = statusFilter && VALID_STATUSES.includes(statusFilter as any) ? statusFilter : undefined;
	// either there is no filter, so all documents; or there is a filter so check the status matches
	const statusFilterFunc = (d: DocumentToMigrateWithStep) => !validFilter || d.MigrationStep.status === validFilter;
	const formatted = documents.filter(statusFilterFunc).map(formatDocument);
	const baseUrl = `/case/${encodeURIComponent(caseReference)}/documents`;

	return {
		pageHeading: 'Document migration status',
		pageCaption: caseReference,
		backLinkUrl: `/case/${encodeURIComponent(caseReference)}`,
		caseReference,
		documents: formatted,
		total: documents.length,
		...statusCounts,
		statusFilter: validFilter,
		baseUrl
	};
}
