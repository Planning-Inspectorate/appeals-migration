import functions from '@azure/functions';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';
import { randomUUID } from 'node:crypto';
import { initialiseService } from '../init.ts';
import type { FunctionService } from '../service.ts';

export function mockContext(): functions.InvocationContext {
	return new functions.InvocationContext({
		invocationId: 'MOCK-' + randomUUID(),
		functionName: 'mock-function'
	});
}

export async function getCase(): Promise<{ caseToMigrate: CaseToMigrate; service: FunctionService }> {
	if (process.argv.length !== 3) {
		throw new Error('case reference is required');
	}
	const caseReference = process.argv[2];
	console.log('running for', caseReference);
	const service = initialiseService();
	const caseToMigrate = await service.databaseClient.caseToMigrate.findUnique({
		where: { caseReference }
	});
	if (!caseToMigrate) {
		throw new Error(`caseToMigrate with reference ${caseReference} not found`);
	}
	return { caseToMigrate, service };
}

export async function cleanup(service: FunctionService): Promise<void> {
	await service.databaseClient.$disconnect();
	await service.sourceDatabaseClient.$disconnect();
	await service.sinkDatabaseClient.$disconnect();
}
