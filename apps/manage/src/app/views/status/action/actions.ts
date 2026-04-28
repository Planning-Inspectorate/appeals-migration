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
