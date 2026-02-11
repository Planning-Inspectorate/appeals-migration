import type { InvocationContext } from '@azure/functions';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';

export type MigrationFunction = (caseToMigrate: CaseToMigrate, context: InvocationContext) => Promise<void>;
