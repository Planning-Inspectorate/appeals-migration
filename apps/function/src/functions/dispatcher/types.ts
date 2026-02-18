import type { CaseToMigrate, DocumentToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';

type NumericFieldNames<Type> = {
	[Key in keyof Type]: Type[Key] extends number ? Key : never;
}[keyof Type];

export type StepIdField = NumericFieldNames<CaseToMigrate> | NumericFieldNames<DocumentToMigrate>;
