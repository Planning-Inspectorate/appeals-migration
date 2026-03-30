import type { MigrationStep, Prisma } from '@pins/appeals-migration-database/src/client/client.ts';

type CaseToMigrateWithSteps = Prisma.CaseToMigrateGetPayload<{
	include: { DataStep: true; DocumentsStep: true; DocumentListStep: true; ValidationStep: true };
}>;

interface StepViewModel {
	status: string;
	errorMessage: string | null;
	invocationId: string | null;
	startedAt: string | null;
	completedAt: string | null;
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
}

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
	timeZone: 'Europe/London',
	dateStyle: 'long',
	timeStyle: 'short'
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

export function buildCaseStatusViewModel(caseToMigrate: CaseToMigrateWithSteps): CaseStatusViewModel {
	return {
		pageHeading: caseToMigrate.caseReference,
		pageCaption: 'Case migration status',
		backLinkUrl: '/',
		caseReference: caseToMigrate.caseReference,
		dataStep: formatStep(caseToMigrate.DataStep),
		documentListStep: formatStep(caseToMigrate.DocumentListStep),
		documentsStep: formatStep(caseToMigrate.DocumentsStep),
		validationStep: formatStep(caseToMigrate.ValidationStep),
		dataValidated: caseToMigrate.dataValidated,
		dataValidationErrors: caseToMigrate.dataValidationErrors,
		documentsValidated: caseToMigrate.documentsValidated,
		documentValidationErrors: caseToMigrate.documentValidationErrors
	};
}
