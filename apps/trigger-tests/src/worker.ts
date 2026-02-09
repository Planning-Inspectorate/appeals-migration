import { app } from '@azure/functions';
import type { InvocationContext } from '@azure/functions';
import { randomInt } from 'node:crypto';
import { newDatabaseClient } from '@pins/appeals-migration-database';
import type { CaseToMigrate } from '@pins/appeals-migration-database/src/client/client.ts';

function delayMilliseconds(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function simulateWork(caseToMigrate: CaseToMigrate, context: InvocationContext): Promise<void> {
	context.log(`Starting work for ${caseToMigrate.caseReference}`);

	// Simulate work
	await delayMilliseconds(randomInt(1000, 3000));

	const databaseConnectionString = process.env.SQL_CONNECTION_STRING;
	if (!databaseConnectionString) {
		throw new Error('Missing SQL_CONNECTION_STRING application setting.');
	}

	const prisma = newDatabaseClient(databaseConnectionString);
	try {
		await prisma.migrationStep.update({
			where: { id: caseToMigrate.dataStepId },
			data: { inProgress: false, complete: true }
		});
	} finally {
		await prisma.$disconnect();
	}

	context.log(`Completed work for ${caseToMigrate.caseReference}`);
}

app.serviceBusQueue('migrationWorker', {
	connection: 'SERVICE_BUS_CONNECTION',
	queueName: '%SERVICE_BUS_QUEUE_NAME%',
	handler: simulateWork
});
