import type { InvocationContext } from '@azure/functions';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import { randomInt } from 'node:crypto';

function delayMilliseconds(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function dataStep(caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> {
	context.log(`Starting data step for ${caseToMigrate.caseReference}`);
	await delayMilliseconds(randomInt(1000, 3000));
	context.log(`Completed data step for ${caseToMigrate.caseReference}`);
}

export async function documentListStep(caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> {
	context.log(`Starting document list step for ${caseToMigrate.caseReference}`);
	await delayMilliseconds(randomInt(1000, 3000));
	context.log(`Completed document list step for ${caseToMigrate.caseReference}`);
}

export async function documentStep(caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> {
	context.log(`Starting document step for ${caseToMigrate.caseReference}`);
	await delayMilliseconds(randomInt(1000, 3000));
	context.log(`Completed document step for ${caseToMigrate.caseReference}`);
}

export async function validationStep(caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> {
	context.log(`Starting validation step for ${caseToMigrate.caseReference}`);
	await delayMilliseconds(randomInt(1000, 3000));
	context.log(`Completed validation step for ${caseToMigrate.caseReference}`);
}
