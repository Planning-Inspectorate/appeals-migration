import type { CaseToMigrate, DocumentToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';

export const createCaseToMigrate = (overrides: Partial<CaseToMigrate> = {}): CaseToMigrate => ({
	caseReference: 'TEST/123',
	dataStepId: 1,
	documentListStepId: 2,
	documentsStepId: 3,
	validationStepId: 4,
	dataValidated: null,
	dataValidationErrors: null,
	documentsValidated: null,
	documentValidationErrors: null,
	...overrides
});

export const createDocumentToMigrate = (overrides: Partial<DocumentToMigrate> = {}): DocumentToMigrate => ({
	documentId: 'DOC123',
	caseReference: 'TEST/123',
	migrationStepId: 1,
	...overrides
});
