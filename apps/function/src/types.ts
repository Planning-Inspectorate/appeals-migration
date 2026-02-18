import type { InvocationContext } from '@azure/functions';
import type { CaseToMigrate, DocumentToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';

export type ItemToMigrate = CaseToMigrate | DocumentToMigrate;

export type MigrationFunction = (itemToMigrate: ItemToMigrate, context: InvocationContext) => Promise<void>;

export const stepStatus = {
	waiting: 'waiting',
	queued: 'queued',
	processing: 'processing',
	complete: 'complete',
	failed: 'failed'
} as const;

export type StepStatus = (typeof stepStatus)[keyof typeof stepStatus];
