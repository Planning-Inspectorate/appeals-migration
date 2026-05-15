import type { MigrationStep, Prisma } from '@pins/appeals-migration-database/src/client/client.ts';
import { MIGRATION_ACTIONS } from '../action/actions.ts';

type CaseToMigrateWithSteps = Prisma.CaseToMigrateGetPayload<{
	include: {
		DataStep: true;
		DocumentsStep: true;
		DocumentListStep: true;
		ValidationStep: true;
		DocumentToMigrate: { include: { MigrationStep: true } };
	};
}>;

interface StepViewModel {
	status: string;
	errorMessage: string | null;
	invocationId: string | null;
	startedAt: string | null;
	completedAt: string | null;
}

export interface DocumentStatusSummary {
	total: number;
	waiting: number;
	queued: number;
	processing: number;
	complete: number;
	failed: number;
	detailsUrl: string;
}

export interface CaseStatusViewModel {
	pageHeading: string;
	pageCaption: string;
	backLinkUrl: string;
	caseReference: string;
	dataStep: StepViewModel;
	documentListStep: StepViewModel;
	documentsStep: StepViewModel;
	validationStep: StepViewModel;
	dataValidated: boolean | null;
	dataValidationErrors: string | null;
	documentsValidated: boolean | null;
	documentValidationErrors: string | null;
	documentStatusSummary: DocumentStatusSummary;
	actions: { text: string; action: string }[];
	actionSuccess?: string;
	actionWarning?: string;
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/London',
	dateStyle: 'long',
	timeStyle: 'medium'
});

function formatStep(step: MigrationStep): StepViewModel {
	return {
		status: step.status,
		errorMessage: step.errorMessage,
		invocationId: step.invocationId,
		startedAt: step.startedAt ? dateFormatter.format(step.startedAt) : null,
		completedAt: step.completedAt ? dateFormatter.format(step.completedAt) : null
	};
}

export function buildCaseStatusViewModel(
	caseToMigrate: CaseToMigrateWithSteps,
	previousUrl: string | null,
	actionSuccess: string | undefined,
	actionWarning: string | undefined
): CaseStatusViewModel {
	const documents = caseToMigrate.DocumentToMigrate || [];
	const statusCounts = { waiting: 0, queued: 0, processing: 0, complete: 0, failed: 0 };
	for (const doc of documents) {
		const status = doc.MigrationStep.status as keyof typeof statusCounts;
		if (status in statusCounts) {
			statusCounts[status]++;
		}
	}

	return {
		pageHeading: caseToMigrate.caseReference,
		pageCaption: 'Case migration status',
		backLinkUrl: previousUrl || '/cases',
		caseReference: caseToMigrate.caseReference,
		dataStep: formatStep(caseToMigrate.DataStep),
		documentListStep: formatStep(caseToMigrate.DocumentListStep),
		documentsStep: formatStep(caseToMigrate.DocumentsStep),
		validationStep: formatStep(caseToMigrate.ValidationStep),
		documentStatusSummary: {
			total: documents.length,
			...statusCounts,
			detailsUrl: `/case/${encodeURIComponent(caseToMigrate.caseReference)}/documents`
		},
		dataValidated: caseToMigrate.dataValidated,
		dataValidationErrors: caseToMigrate.dataValidationErrors,
		documentsValidated: caseToMigrate.documentsValidated,
		documentValidationErrors: caseToMigrate.documentValidationErrors,
		actionSuccess: actionSuccess && actionDisplayNames.get(actionSuccess),
		actionWarning,
		actions: [...actionDisplayNames.entries()].map(([k, v]) => {
			return {
				text: v,
				action: k
			};
		})
	};
}

const actionDisplayNames = new Map<string, string>([
	[MIGRATION_ACTIONS.DATA, 'Migrate data'],
	[MIGRATION_ACTIONS.LIST_DOCUMENTS, 'List documents'],
	[MIGRATION_ACTIONS.DOCUMENTS, 'Migrate documents'],
	[MIGRATION_ACTIONS.FAILED_DOCUMENTS, 'Migrate failed documents'],
	[MIGRATION_ACTIONS.VALIDATE, 'Validate migration']
]);
