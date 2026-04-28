import type { Request } from 'express';

export const MIGRATION_ACTIONS = Object.freeze({
	DATA: 'data',
	LIST_DOCUMENTS: 'list-documents',
	DOCUMENTS: 'documents',
	VALIDATE: 'validate'
});

export const ACTION_TO_QUEUE_NAME = new Map([
	[MIGRATION_ACTIONS.DATA, 'appeals-migration-migrate-data'],
	[MIGRATION_ACTIONS.LIST_DOCUMENTS, 'appeals-migration-list-documents-to-migrate'],
	[MIGRATION_ACTIONS.DOCUMENTS, 'appeals-migration-migrate-documents'],
	[MIGRATION_ACTIONS.VALIDATE, 'appeals-migration-validate-migrated-cases']
]);

export function setSessionActionSuccess(req: Request, action: string) {
	if (req.session) {
		req.session.migrationActionSuccess = action;
	}
}

export function setSessionActionWarning(req: Request, warning: string) {
	if (req.session) {
		req.session.migrationActionWarning = warning;
	}
}

export function getSessionActionSuccess(req: Request): string | undefined {
	const value = req.session?.migrationActionSuccess;
	delete req.session?.migrationActionSuccess;
	return value;
}

export function getSessionActionWarning(req: Request): string | undefined {
	const value = req.session?.migrationActionWarning;
	delete req.session?.migrationActionWarning;
	return value;
}
