import type { InvocationContext } from '@azure/functions';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import { randomInt } from 'node:crypto';

function delayMilliseconds(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function dataMigration(caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> {
	context.log(`Starting data migration for ${caseToMigrate.caseReference}`);
	await delayMilliseconds(randomInt(1000, 3000));
	context.log(`Completed data migration for ${caseToMigrate.caseReference}`);
}

export async function documentMigration(caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> {
	context.log(`Starting document migration for ${caseToMigrate.caseReference}`);
	await delayMilliseconds(randomInt(1000, 3000));
	context.log(`Completed document migration for ${caseToMigrate.caseReference}`);
}

export async function validationStep(caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> {
	context.log(`Starting validation for ${caseToMigrate.caseReference}`);
	await delayMilliseconds(randomInt(1000, 3000));
	context.log(`Completed validation for ${caseToMigrate.caseReference}`);
}
