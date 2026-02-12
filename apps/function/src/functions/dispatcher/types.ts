import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';

export type StepIdField = {
	[Key in keyof CaseToMigrate]: CaseToMigrate[Key] extends number ? Key : never;
}[keyof CaseToMigrate];
